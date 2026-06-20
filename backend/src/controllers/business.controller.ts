import { Request, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/response'
import { isValidNTN, isValidSTRN } from '../utils/helpers'

export const createBusinessProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const { businessName, ntn, strn, address, city, phone, businessType, securityToken, posId } = req.body

    // Validation
    if (!businessName || !ntn || !strn || !address || !city || !phone || !businessType) {
      sendError(res, 'All required fields must be filled', 400)
      return
    }
    if (!isValidNTN(ntn)) {
      sendError(res, 'Invalid NTN format (must be 7 digits)', 400)
      return
    }
    if (!isValidSTRN(strn)) {
      sendError(res, 'Invalid STRN format (must be 11 digits)', 400)
      return
    }

    // Check if business already exists for this user
    const existing = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (existing) {
      sendError(res, 'Business profile already exists', 400)
      return
    }

    // Check NTN uniqueness manually for a clear error message
    const ntnTaken = await prisma.business.findUnique({ where: { ntn } })
    if (ntnTaken) {
      sendError(res, 'NTN is already registered to another business', 400)
      return
    }

    // Check STRN uniqueness manually
    const strnTaken = await prisma.business.findUnique({ where: { strn } })
    if (strnTaken) {
      sendError(res, 'STRN is already registered to another business', 400)
      return
    }

    const business = await prisma.business.create({
      data: {
        userId:       req.user.id,
        businessName,
        ntn,
        strn,
        address,
        city,
        phone,
        businessType,
        securityToken: securityToken || null,
        posId:         posId || null,
      }
    })

    sendSuccess(res, business, 'Business profile created', 201)

  } catch (error: any) {
    console.error('createBusinessProfile error:', error)

    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0]
      sendError(res, `${field?.toUpperCase()} is already registered`, 400)
      return
    }

    sendError(res, error.message || 'Failed to create business profile', 500)
  }
}

export const getBusinessProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const business = await prisma.business.findUnique({
      where: { userId: req.user.id },
      include: { branches: true }
    })

    if (!business) {
      sendError(res, 'Business profile not found', 404)
      return
    }

    sendSuccess(res, business, 'Business profile fetched')

  } catch (error: any) {
    console.error('getBusinessProfile error:', error)
    sendError(res, error.message || 'Failed to fetch business profile', 500)
  }
}

export const updateBusinessProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const { businessName, address, city, phone, businessType } = req.body

    if (!businessName || !address || !city || !phone) {
      sendError(res, 'All required fields must be filled', 400)
      return
    }

    const existing = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!existing) {
      sendError(res, 'Business profile not found', 404)
      return
    }

    const business = await prisma.business.update({
      where: { userId: req.user.id },
      data: { businessName, address, city, phone, businessType }
    })

    sendSuccess(res, business, 'Business profile updated')

  } catch (error: any) {
    console.error('updateBusinessProfile error:', error)
    sendError(res, error.message || 'Failed to update business profile', 500)
  }
}

export const updateFBRToken = async (req: any, res: Response): Promise<void> => {
  try {
    const { securityToken, posId } = req.body

    const existing = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!existing) {
      sendError(res, 'Business profile not found', 404)
      return
    }

    const updated = await prisma.business.update({
      where: { userId: req.user.id },
      data: { securityToken, posId }
    })

    sendSuccess(res, updated, 'FBR token updated successfully')

  } catch (error: any) {
    console.error('updateFBRToken error:', error)
    sendError(res, error.message || 'Failed to update FBR token', 500)
  }
}

export const addBranch = async (req: any, res: Response): Promise<void> => {
  try {
    const { branchName, address, city, latitude, longitude, posType } = req.body

    const business = await prisma.business.findUnique({ where: { userId: req.user.id } })
    if (!business) {
      sendError(res, 'Business not found', 404)
      return
    }

    const branch = await prisma.branch.create({
      data: {
        businessId: business.id,
        branchName,
        address,
        city,
        latitude:  parseFloat(latitude),
        longitude: parseFloat(longitude),
        posType
      }
    })

    sendSuccess(res, branch, 'Branch added', 201)

  } catch (error: any) {
    console.error('addBranch error:', error)
    sendError(res, error.message || 'Failed to add branch', 500)
  }
}