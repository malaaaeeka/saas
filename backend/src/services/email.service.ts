import nodemailer from 'nodemailer'
import logger from '../utils/logger'

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  async sendInvoiceSuccess(invoice: any, fbrInvoiceNo: string, pdfUrl: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: invoice.business.user.email,
        subject: `Invoice ${fbrInvoiceNo} — Sent to FBR Successfully`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Invoice Sent Successfully</h2>
            <p>Your invoice has been successfully submitted to FBR.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>FBR Invoice Number:</strong> ${fbrInvoiceNo}</p>
              <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> PKR ${invoice.totalAmount}</p>
              <p><strong>Total Sales Tax:</strong> PKR ${invoice.totalSalesTax}</p>
            </div>
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated message from FBR Invoice System.
            </p>
          </div>
        `
      })
      logger.info(`Invoice success email sent for FBR: ${fbrInvoiceNo}`)
    } catch (error) {
      logger.error('Failed to send invoice success email:', error)
    }
  }

  async sendInvoiceFailure(invoice: any, errorMessage: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: invoice.business.user.email,
        subject: `Invoice Submission Failed — Action Required`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Invoice Submission Failed</h2>
            <p>Your invoice could not be submitted to FBR.</p>
            <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;">
              <p><strong>Error:</strong> ${errorMessage}</p>
            </div>
            <p>Please login to your dashboard and resubmit the invoice.</p>
          </div>
        `
      })
    } catch (error) {
      logger.error('Failed to send invoice failure email:', error)
    }
  }

  async sendForgotPassword(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Reset Your Password — FBR Invoice System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Reset Your Password</h2>
            <p>You requested a password reset. Click the button below to reset your password.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetUrl}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280;">This link expires in 1 hour.</p>
            <p style="color: #6b7280;">If you did not request this, ignore this email.</p>
          </div>
        `
      })
      logger.info(`Password reset email sent to: ${email}`)
    } catch (error) {
      logger.error('Failed to send password reset email:', error)
    }
  }

  async sendWelcome(email: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Welcome to FBR Invoice System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to FBR Invoice System</h2>
            <p>Your account has been created successfully.</p>
            <p>You can now log in and start sending invoices to FBR digitally.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${process.env.FRONTEND_URL}/login"
                 style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Login Now
              </a>
            </div>
          </div>
        `
      })
    } catch (error) {
      logger.error('Failed to send welcome email:', error)
    }
  }
async sendInvoiceToBuyer({
    toEmail,
    toName,
    invoice,
    business,
    pdfBuffer
  }: {
    toEmail:   string
    toName:    string
    invoice:   any
    business:  any
    pdfBuffer: Buffer
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!invoice.fbrInvoiceNo) {
        return { success: false, error: 'Invoice has not been submitted to FBR yet.' }
      }

      const grandTotal = (
        Number(invoice.totalAmount) +
        Number(invoice.totalSalesTax) +
        Number(invoice.totalFed) -
        Number(invoice.totalDiscount)
      ).toFixed(2)

      const typeLabel: Record<string, string> = {
        SALE:        'Tax Invoice',
        PURCHASE:    'Purchase Invoice',
        CREDIT_NOTE: 'Credit Note',
        DEBIT_NOTE:  'Debit Note'
      }
      const docType = typeLabel[invoice.invoiceType] || 'Invoice'

      await this.transporter.sendMail({
        from:    process.env.SMTP_FROM,
        to:      `${toName} <${toEmail}>`,
        subject: `${docType} — FBR No: ${invoice.fbrInvoiceNo} from ${business.businessName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 24px; border-radius: 8px;">

            <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${docType}</h1>
              <p style="color: #aaaaaa; margin: 8px 0 0 0; font-size: 13px;">Federal Board of Revenue — e-Invoice System</p>
            </div>

            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #155724; font-weight: bold; font-size: 14px;">✓ Verified by FBR</p>
              <p style="margin: 6px 0 0 0; color: #155724; font-size: 13px;">FBR Invoice No: <strong>${invoice.fbrInvoiceNo}</strong></p>
              <p style="margin: 4px 0 0 0; color: #155724; font-size: 12px;">Submitted on: ${new Date(invoice.sentAt).toLocaleString()}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
              <tr style="background: #f0f0f0;">
                <td style="padding: 10px 16px; font-size: 12px; color: #666; font-weight: bold;">SELLER</td>
                <td style="padding: 10px 16px; font-size: 12px; color: #666; font-weight: bold;">BUYER</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; font-size: 13px; color: #333; border-top: 1px solid #eee;">
                  <strong>${business.businessName}</strong><br/>
                  NTN: ${business.ntn}<br/>
                  STRN: ${business.strn}
                </td>
                <td style="padding: 10px 16px; font-size: 13px; color: #333; border-top: 1px solid #eee;">
                  <strong>${toName}</strong><br/>
                  ${invoice.buyerNtn ? `NTN: ${invoice.buyerNtn}<br/>` : ''}
                  ${invoice.buyerCnic ? `CNIC: ${invoice.buyerCnic}` : ''}
                </td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
              <tr style="background: #f0f0f0;">
                <td colspan="2" style="padding: 10px 16px; font-size: 12px; color: #666; font-weight: bold;">INVOICE SUMMARY</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; font-size: 13px; color: #666; border-top: 1px solid #eee;">Invoice Date</td>
                <td style="padding: 10px 16px; font-size: 13px; color: #333; border-top: 1px solid #eee; text-align: right;">${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; font-size: 13px; color: #666; border-top: 1px solid #eee;">Subtotal</td>
                <td style="padding: 10px 16px; font-size: 13px; color: #333; border-top: 1px solid #eee; text-align: right;">PKR ${Number(invoice.totalAmount).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; font-size: 13px; color: #666; border-top: 1px solid #eee;">Sales Tax</td>
                <td style="padding: 10px 16px; font-size: 13px; color: #2e7d32; border-top: 1px solid #eee; text-align: right;">PKR ${Number(invoice.totalSalesTax).toFixed(2)}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #333; border-top: 2px solid #ddd;">Grand Total</td>
                <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #333; border-top: 2px solid #ddd; text-align: right;">PKR ${grandTotal}</td>
              </tr>
            </table>

            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 12px; color: #856404;">
                📎 The full invoice PDF is attached. Scan the QR code inside to verify this invoice on FBR's system.
              </p>
            </div>

            <p style="font-size: 11px; color: #999; text-align: center; margin: 0;">
              This email was sent by ${business.businessName} via FBR e-Invoice System.<br/>
              NTN: ${business.ntn}
            </p>

          </div>
        `,
        attachments: [
          {
            filename:    `invoice-${invoice.fbrInvoiceNo}.pdf`,
            content:     pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      })

      logger.info(`Invoice email sent to ${toEmail} for FBR No: ${invoice.fbrInvoiceNo}`)
      return { success: true }

    } catch (error: any) {
      logger.error('sendInvoiceToBuyer error:', error.message)
      return { success: false, error: error.message || 'Failed to send email' }
    }
  }
}

export default new EmailService()