import Joi from 'joi'

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(
    'SUPER_ADMIN',
    'CA_PARTNER',
    'BUSINESS',
    'BUSINESS_STAFF'
  ).required(),
  referralCode: Joi.string().optional().allow('')   // 👈 only add this line
})

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

export const businessSchema = Joi.object({
  businessName: Joi.string().required(),
  ntn: Joi.string().length(7).required(),
  strn: Joi.string().length(11).required(),
  address: Joi.string().required(),
  city: Joi.string().required(),
  phone: Joi.string().required(),
  businessType: Joi.string().required()
})

export const invoiceSchema = Joi.object({
  invoiceType: Joi.string().valid(
    'SALE',
    'PURCHASE',
    'DEBIT_NOTE',
    'CREDIT_NOTE'
  ).required(),
  invoiceDate: Joi.date().required(),
  buyerNtn: Joi.string().optional(),
  buyerCnic: Joi.string().optional(),
  buyerName: Joi.string().optional(),
  saleType: Joi.string().required(),
  branchId: Joi.string().optional(),
  items: Joi.array().items(
    Joi.object({
      hsCode: Joi.string().required(),
      productCode: Joi.string().optional(),
      description: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      uom: Joi.string().required(),
      rate: Joi.number().positive().required(),
      totalAmount: Joi.number().positive().required(),
      salesTax: Joi.number().min(0).required(),
      sroSchedule: Joi.string().required(),
      fed: Joi.number().min(0).default(0),
      withholdingTax: Joi.number().min(0).default(0),
      discount: Joi.number().min(0).default(0)
    })
  ).min(1).required()
})