export const FBR_SANDBOX_URL =
  'https://esp.fbr.gov.pk:8244/DigitalInvoicing/v1/PostInvoiceData_v1'

export const FBR_PRODUCTION_URL =
  'https://gw.fbr.gov.pk/pdi/v1/api/DigitalInvoicing/PostInvoiceData_v1'

export const INVOICE_TYPES = {
  SALE: 1,
  PURCHASE: 2,
  DEBIT_NOTE: 3,
  CREDIT_NOTE: 4
}

export const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: 'Starter',
    price: 6000,
    invoiceLimit: 300
  },
  GROWTH: {
    name: 'Growth',
    price: 12000,
    invoiceLimit: 1000
  },
  BUSINESS: {
    name: 'Business',
    price: 22000,
    invoiceLimit: 5000
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 45000,
    invoiceLimit: 999999
  }
}

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CA_PARTNER: 'CA_PARTNER',
  BUSINESS: 'BUSINESS',
  BUSINESS_STAFF: 'BUSINESS_STAFF'
}

export const INVOICE_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  RETRY: 'RETRY'
}

export const MAX_RETRY_COUNT = 3
export const RETRY_DELAY_MS = 5 * 60 * 1000