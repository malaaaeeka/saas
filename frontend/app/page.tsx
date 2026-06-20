'use client'

import HeroScene from '@/components/HeroScene'

export default function LandingPage() {
  return (
    <div 
      className="w-screen h-screen overflow-hidden" 
      style={{ backgroundColor: '#679267', paddingTop: '72px' }}
    >
      <HeroScene />
    </div>
  )
}