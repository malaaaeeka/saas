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

export const invoiceItemSchema = Joi.object({
  documentNumber: Joi.string().trim().min(1).required(),
  invoiceRefNo: Joi.string().allow('').optional(), // enforced conditionally below via invoiceSchema
  hsCode: Joi.string().trim().min(1).required(),
  hsCodeDescription: Joi.string().allow('').optional(),
  productCode: Joi.string().allow('').optional(),
  description: Joi.string().trim().min(1).required(),
  quantity: Joi.number().required(),
  uom: Joi.string().trim().min(1).required(),
  rate: Joi.number().required(),
  taxRate: Joi.string().allow('').optional(),
  totalAmount: Joi.number().required(),
  salesTax: Joi.number().min(0).required(),
  fixedNotifiedValue: Joi.number().min(0).default(0),
  extraTax: Joi.number().min(0).default(0),
  furtherTax: Joi.number().min(0).default(0),
  pfadValue: Joi.number().min(0).default(0),
  stWithheld: Joi.number().min(0).default(0),
  fed: Joi.number().min(0).default(0),
  withholdingTax: Joi.number().min(0).default(0),
  discount: Joi.number().min(0).default(0),
  sroSchedule: Joi.string().trim().min(1).required(),
  itemSNo: Joi.string().allow('').optional(),
  reason: Joi.string().allow('').optional(),
  reasonRemarks: Joi.string().allow('').optional(),
  petroleumLevyOn: Joi.string().allow('').optional(),
})

export const invoiceSchema = Joi.object({
  invoiceType: Joi.string().valid('SALE', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE').required(),
  invoiceDate: Joi.date().required(),
  documentType: Joi.string().valid('Sale Invoice', 'Credit Note', 'Debit Note', 'STWH').required(),
  originationProvince: Joi.string().trim().min(1).required(),
  destinationProvince: Joi.string().trim().min(1).required(),
  buyerId: Joi.string().allow(null, '').optional(),
  buyerNtn: Joi.string().allow('').optional(),
  buyerCnic: Joi.string().allow('').optional(),
  buyerName: Joi.string().allow('').optional(),
  buyerType: Joi.string().valid('Registered', 'Unregistered', 'Unregistered Distributor', 'Retail Consumer').required(),
  saleType: Joi.string().trim().min(1).required(),
  branchId: Joi.string().allow(null, '').optional(),
  originalInvoiceId: Joi.string().allow(null, '').optional(),
  amendmentReason: Joi.string().allow('').optional(),
  status: Joi.string().valid('DRAFT', 'PENDING').optional(),

  items: Joi.array().items(invoiceItemSchema).min(1).required()
})
  // Cross-field rules Joi enforces server-side, matching your frontend's validateForm():
  .when(Joi.object({ buyerType: Joi.valid('Registered') }).unknown(), {
    then: Joi.object({ buyerNtn: Joi.string().trim().min(1).required() })
  })
  .when(Joi.object({ buyerType: Joi.valid('Unregistered', 'Unregistered Distributor', 'Retail Consumer') }).unknown(), {
    then: Joi.object({ buyerCnic: Joi.string().trim().min(1).required() })
  })
  .when(Joi.object({ documentType: Joi.valid('Credit Note', 'Debit Note') }).unknown(), {
    then: Joi.object({
      amendmentReason: Joi.string().trim().min(1).required(),
      items: Joi.array().items(
        invoiceItemSchema.keys({ invoiceRefNo: Joi.string().trim().min(1).required() })
      ).min(1).required()
    })
  })