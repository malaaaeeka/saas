import QRCode from 'qrcode'

export const generateQRCode = async (data: string): Promise<Buffer> => {
  const qrBuffer = await QRCode.toBuffer(data, {
    errorCorrectionLevel: 'M',
    width: 150,
    margin: 1
  })
  return qrBuffer
}

export const generateInvoiceQRData = (invoice: any): string => {
  // If invoice has been submitted to FBR, create verification URL
  if (invoice.fbrInvoiceNo && invoice.fbrSecurityCode) {
    const fbrVerifyUrl = `https://verify.fbr.gov.pk/verify?irn=${invoice.fbrInvoiceNo}&sc=${invoice.fbrSecurityCode}`
    return fbrVerifyUrl
  }

  // Otherwise, encode invoice data as JSON
  const data = {
    id: invoice.id,
    status: invoice.status,
    ntn: invoice.business?.ntn || '',
    date: new Date(invoice.invoiceDate).toLocaleDateString(),
    amount: Number(invoice.totalAmount).toFixed(2),
    tax: Number(invoice.totalSalesTax).toFixed(2)
  }
  return JSON.stringify(data)
}