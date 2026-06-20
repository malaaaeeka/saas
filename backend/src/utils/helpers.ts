export const formatDate = (date: Date): string => {
  return new Date(date)
    .toISOString()
    .replace('T', ' ')
    .substring(0, 23)
}

export const generateReference = (): string => {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `INV-${timestamp}-${random}`
}

export const calculateTax = (amount: number, taxRate: number): number => {
  return parseFloat(((amount * taxRate) / 100).toFixed(2))
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR'
  }).format(amount)
}

export const paginateQuery = (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit
  return { skip, take: limit }
}

export const isValidNTN = (ntn: string): boolean => {
  return /^\d{7}$/.test(ntn)
}

export const isValidCNIC = (cnic: string): boolean => {
  return /^\d{13}$/.test(cnic)
}

export const isValidSTRN = (strn: string): boolean => {
  return /^\d{11}$/.test(strn)
}