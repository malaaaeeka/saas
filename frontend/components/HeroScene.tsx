'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const routes: Record<string, string> = {};

const ROUTE_EVERYTHING_TO_LOGIN_FOR_TESTING = true;
const TEST_ROUTE = '/login';

const INTRO_STAGGER_MS = 60;
const INTRO_DURATION_MS = 350;
const INTRO_DROP_HEIGHT = 2;

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

interface IntroState {
  mesh: THREE.Mesh;
  finalPos: THREE.Vector3;
  finalScale: THREE.Vector3;
  startTime: number;
}

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const clickable: THREE.Object3D[] = [];

    const originalEmissive = new Map<THREE.Mesh, THREE.Color>();
    let hovered: THREE.Mesh | null = null;

    const introStates: IntroState[] = [];
    let introStartTime: number | null = null;
    let introDone = false;

    // Store center and maxDim so onResize can reposition camera
    let modelCenter = new THREE.Vector3();
    let modelMaxDim = 1;

    function positionCamera() {
      const isMobile = container.clientWidth < 768;
      const isSmallMobile = container.clientWidth < 400;

      // On portrait mobile, scene is tall and narrow — pull back more
      // and center it differently
      const zMult = isSmallMobile ? 2.2 : isMobile ? 1.8 : 0.7;
const yMult = isSmallMobile ? 1.8 : isMobile ? 1.6 : 1.0;
const xMult = isSmallMobile ? 0.1 : isMobile ? 0.1 : 0.2;
      camera.position.set(
        modelCenter.x + modelMaxDim * xMult,
        modelCenter.y + modelMaxDim * yMult,
        modelCenter.z + modelMaxDim * zMult
      );
      camera.lookAt(modelCenter);
      camera.near = modelMaxDim / 100;
      camera.far = modelMaxDim * 100;
      camera.updateProjectionMatrix();
    }

    const loader = new GLTFLoader();
    loader.load('/models/60s_office_props.glb', (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      let meshIndex = 0;

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          console.log('mesh name:', mesh.name);

          const isClickable = ROUTE_EVERYTHING_TO_LOGIN_FOR_TESTING || !!routes[mesh.name];
          if (isClickable) {
            clickable.push(mesh);
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat && mat.emissive) {
              originalEmissive.set(mesh, mat.emissive.clone());
            }
          }

          const finalPos = mesh.position.clone();
          const finalScale = mesh.scale.clone();

          mesh.position.y = finalPos.y + INTRO_DROP_HEIGHT;
          mesh.scale.set(0.001, 0.001, 0.001);

          introStates.push({
            mesh,
            finalPos,
            finalScale,
            startTime: meshIndex * INTRO_STAGGER_MS,
          });

          meshIndex++;
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      modelCenter = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      modelMaxDim = Math.max(size.x, size.y, size.z);

      positionCamera();

      introStartTime = performance.now();
    });

    function setHover(mesh: THREE.Mesh | null) {
      if (hovered === mesh) return;

      if (hovered) {
        const mat = hovered.material as THREE.MeshStandardMaterial;
        const orig = originalEmissive.get(hovered);
        if (mat && mat.emissive && orig) mat.emissive.copy(orig);
        renderer.domElement.style.cursor = 'default';
      }

      hovered = mesh;

      if (hovered) {
        const mat = hovered.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissive) mat.emissive.set(0xFFD700);
        renderer.domElement.style.cursor = 'pointer';
      }
    }

    function getIntersect(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      if (!introDone) return null;
      const hits = raycaster.intersectObjects(clickable, false);
      return hits.length > 0 ? (hits[0].object as THREE.Mesh) : null;
    }

    function onMouseMove(event: MouseEvent) {
      setHover(getIntersect(event));
    }

    function onClick(event: MouseEvent) {
      const hit = getIntersect(event);
      if (!hit) return;
      const route = ROUTE_EVERYTHING_TO_LOGIN_FOR_TESTING
        ? TEST_ROUTE
        : routes[hit.name];
      if (route) window.location.href = route;
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    function onResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      positionCamera(); // reposition camera for new screen size
    }
    window.addEventListener('resize', onResize);

    function updateIntro(now: number) {
      if (introStartTime === null || introDone) return;

      const elapsed = now - introStartTime;
      let allFinished = true;

      for (const state of introStates) {
        const localElapsed = elapsed - state.startTime;

        if (localElapsed <= 0) {
          allFinished = false;
          continue;
        }

        const t = Math.min(localElapsed / INTRO_DURATION_MS, 1);
        if (t < 1) allFinished = false;

        const eased = easeOutBack(t);

        state.mesh.position.y = THREE.MathUtils.lerp(
          state.finalPos.y + INTRO_DROP_HEIGHT,
          state.finalPos.y,
          eased
        );
        state.mesh.position.x = state.finalPos.x;
        state.mesh.position.z = state.finalPos.z;

        const scaleT = Math.min(t, 1);
        state.mesh.scale.set(
          state.finalScale.x * scaleT,
          state.finalScale.y * scaleT,
          state.finalScale.z * scaleT
        );
      }

      if (allFinished) introDone = true;
    }

    function animate() {
      requestAnimationFrame(animate);
      updateIntro(performance.now());
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}