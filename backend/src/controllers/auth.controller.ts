import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/response'
import { registerSchema, loginSchema } from '../utils/validators'
import emailService from '../services/email.service'

const generateToken = (userId: string, role: string): string => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
  )
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = registerSchema.validate(req.body)
    if (error) {
      sendError(res, error.details[0].message, 400)
      return
    }
    const { email, password, role } = req.body
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      sendError(res, 'Email already registered', 400)
      return
    }
    const hashedPassword = await bcrypt.hash(password, 12)
  const { referralCode } = req.body

const user = await prisma.user.create({
  data: { email, password: hashedPassword, role }
})

// Create CA profile if CA_PARTNER
if (role === 'CA_PARTNER') {
  await prisma.cAProfile.create({
    data: {
      userId: user.id,
      firmName: `${email.split('@')[0]} CA Firm`,
      icapNumber: '',
      phone: '',
      address: '',
      commissionPct: 50,
      referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
    }
  })
}

// Link business to CA if referral code provided
if (role === 'BUSINESS' && referralCode) {
  const caProfile = await prisma.cAProfile.findUnique({
    where: { referralCode }
  })
  if (caProfile) {
    await prisma.business.create({
  data: {
    userId: user.id,
    caId: caProfile.id,
    businessName: email.split('@')[0],
    ntn: `PENDING-${user.id}`,
    strn: `PENDING-${user.id}`,
    address: '',
    city: '',
    phone: '',
    businessType: 'GENERAL'
  }
})
  }
}

try {
  await emailService.sendWelcome(email)
} catch (emailError) {
  console.log('Email failed but continuing...')
}
    const token = generateToken(user.id, user.role)
    sendSuccess(res, {
      token,
      user: { id: user.id, email: user.email, role: user.role }
    }, 'Registration successful', 201)
 } catch (error: any) {
  console.error('REGISTER ERROR:', error.message)
  sendError(res, error.message, 500)
}
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = loginSchema.validate(req.body)
    if (error) {
      sendError(res, error.details[0].message, 400)
      return
    }
    const { email, password } = req.body
    const user = await prisma.user.findUnique({
      where: { email },
      include: { business: true, caProfile: true }
    })
    if (!user) {
      sendError(res, 'Invalid email or password', 401)
      return
    }
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      sendError(res, 'Invalid email or password', 401)
      return
    }
    const token = generateToken(user.id, user.role)
    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        business: user.business,
        caProfile: user.caProfile
      }
    }, 'Login successful')
  } catch (error) {
    sendError(res, 'Login failed', 500)
  }
}

export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { business: true, caProfile: true }
    })
    sendSuccess(res, { user }, 'User fetched successfully')
  } catch (error) {
    sendError(res, 'Failed to get user', 500)
  }
}

export const changePassword = async (req: any, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) {
      sendError(res, 'User not found', 404)
      return
    }
    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      sendError(res, 'Current password is incorrect', 400)
      return
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    })
    sendSuccess(res, null, 'Password changed successfully')
  } catch (error) {
    sendError(res, 'Failed to change password', 500)
  }
}

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      sendSuccess(res, null, 'If this email exists you will receive a reset link')
      return
    }
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: resetExpiry
      }
    })
    await emailService.sendForgotPassword(email, resetToken)
    sendSuccess(res, null, 'Password reset email sent')
  } catch (error) {
    sendError(res, 'Failed to process request', 500)
  }
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    })
    if (!user) {
      sendError(res, 'Invalid or expired reset token', 400)
      return
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    })
    sendSuccess(res, null, 'Password reset successfully')
  } catch (error) {
    sendError(res, 'Failed to reset password', 500)
  }
}