import Bull from 'bull'
import prisma from '../config/database'
import fbrService from './fbr.service'
import emailService from './email.service'

const invoiceQueue = new Bull('invoice-queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379
  }
})

invoiceQueue.process(async (job) => {
  const { invoiceId } = job.data

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: true,
      business: { include: { user: true } }
    }
  })

  if (!invoice) throw new Error('Invoice not found')

  const formatted = fbrService.formatInvoice(invoice, invoice.business)
  const result = await fbrService.postInvoice(formatted, invoice.business.securityToken!)

  if (result.success) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        fbrInvoiceNo: result.fbrInvoiceNo,
        status: 'SENT',
        sentAt: new Date()
      }
    })

    await emailService.sendInvoiceSuccess(invoice, result.fbrInvoiceNo!, '')
  } else {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: invoice.retryCount < 3 ? 'RETRY' : 'FAILED',
        errorMessage: result.error,
        retryCount: { increment: 1 }
      }
    })

    if (invoice.retryCount < 3) {
      await invoiceQueue.add({ invoiceId }, { delay: 5 * 60 * 1000 })
    } else {
      await emailService.sendInvoiceFailure(invoice, result.error!)
    }
  }
})

export { invoiceQueue }