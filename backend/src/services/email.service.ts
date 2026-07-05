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
          <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5d8;">

            <div style="background: #1e2216; padding: 36px 40px;">
              <p style="color: #c8e64c; margin: 0 0 8px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-family: Arial, sans-serif;">
                FBR Invoice System
              </p>
              <h1 style="color: #f0edd8; margin: 0; font-size: 26px; font-weight: 600;">
                Invoice Sent Successfully
              </h1>
            </div>

            <div style="padding: 32px 40px; font-family: Arial, sans-serif;">
              <p style="font-size: 14px; color: #4a4a3a; line-height: 1.7; margin: 0 0 24px 0;">
                Your invoice has been successfully submitted to FBR.
              </p>
              <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e5e5d8; border-bottom: 1px solid #e5e5d8;">
                <tr>
                  <td style="padding: 12px 0; font-size: 13px; color: #6b6b52;">FBR Invoice Number</td>
                  <td style="padding: 12px 0; font-size: 13px; color: #1e2216; text-align: right; font-weight: 700;">${fbrInvoiceNo}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 13px; color: #6b6b52; border-top: 1px solid #f0efe8;">Invoice Date</td>
                  <td style="padding: 12px 0; font-size: 13px; color: #1e2216; text-align: right; border-top: 1px solid #f0efe8;">${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 13px; color: #6b6b52; border-top: 1px solid #f0efe8;">Total Amount</td>
                  <td style="padding: 12px 0; font-size: 13px; color: #1e2216; text-align: right; border-top: 1px solid #f0efe8;">PKR ${invoice.totalAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; font-size: 13px; color: #6b6b52; border-top: 1px solid #f0efe8;">Total Sales Tax</td>
                  <td style="padding: 12px 0; font-size: 13px; color: #1e2216; text-align: right; border-top: 1px solid #f0efe8;">PKR ${invoice.totalSalesTax}</td>
                </tr>
              </table>
            </div>

            <div style="background: #f9f9f4; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5d8; font-family: Arial, sans-serif;">
              <p style="font-size: 11px; color: #9a9a7e; margin: 0; line-height: 1.6;">
                This is an automated message from FBR Invoice System.
              </p>
            </div>

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
          <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5d8;">

            <div style="background: #1e2216; padding: 36px 40px;">
              <p style="color: #c8e64c; margin: 0 0 8px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-family: Arial, sans-serif;">
                FBR Invoice System
              </p>
              <h1 style="color: #f0edd8; margin: 0; font-size: 26px; font-weight: 600;">
                Invoice Submission Failed
              </h1>
            </div>

            <div style="padding: 32px 40px; font-family: Arial, sans-serif;">
              <p style="font-size: 14px; color: #4a4a3a; line-height: 1.7; margin: 0 0 24px 0;">
                Your invoice could not be submitted to FBR.
              </p>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 18px 20px; margin-bottom: 28px;">
                <p style="margin: 0; color: #b91c1c; font-weight: 700; font-size: 13px;">Error</p>
                <p style="margin: 6px 0 0 0; color: #b91c1c; font-size: 13px; line-height: 1.6;">${errorMessage}</p>
              </div>
              <p style="font-size: 14px; color: #4a4a3a; line-height: 1.7; margin: 0;">
                Please login to your dashboard and resubmit the invoice.
              </p>
            </div>

            <div style="background: #f9f9f4; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5d8; font-family: Arial, sans-serif;">
              <p style="font-size: 11px; color: #9a9a7e; margin: 0; line-height: 1.6;">
                This is an automated message from FBR Invoice System.
              </p>
            </div>

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
          <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5d8;">

            <div style="background: #1e2216; padding: 36px 40px;">
              <p style="color: #c8e64c; margin: 0 0 8px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-family: Arial, sans-serif;">
                FBR Invoice System
              </p>
              <h1 style="color: #f0edd8; margin: 0; font-size: 26px; font-weight: 600;">
                Reset Your Password
              </h1>
            </div>

            <div style="padding: 32px 40px; font-family: Arial, sans-serif;">
              <p style="font-size: 14px; color: #4a4a3a; line-height: 1.7; margin: 0 0 24px 0;">
                We received a request to reset the password for your account. Click the button below to choose a new password.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}"
                   style="background: #1e2216; color: #f0edd8; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="font-size: 12px; color: #6b6b52; line-height: 1.6; margin: 0; border-left: 3px solid #c8e64c; padding-left: 14px;">
                This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
              </p>
            </div>

            <div style="background: #f9f9f4; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5d8; font-family: Arial, sans-serif;">
              <p style="font-size: 11px; color: #9a9a7e; margin: 0; line-height: 1.6;">
                This is an automated message from FBR Invoice System.<br/>
                Please do not reply to this email.
              </p>
            </div>

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
          <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5d8;">

            <div style="background: #1e2216; padding: 36px 40px;">
              <p style="color: #c8e64c; margin: 0 0 8px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-family: Arial, sans-serif;">
                FBR Invoice System
              </p>
              <h1 style="color: #f0edd8; margin: 0; font-size: 26px; font-weight: 600;">
                Welcome to FBR Invoice System
              </h1>
            </div>

            <div style="padding: 32px 40px; font-family: Arial, sans-serif;">
              <p style="font-size: 14px; color: #4a4a3a; line-height: 1.7; margin: 0 0 12px 0;">
                Your account has been created successfully.
              </p>
              <p style="font-size: 14px; color: #4a4a3a; line-height: 1.7; margin: 0 0 24px 0;">
                You can now log in and start sending invoices to FBR digitally.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.FRONTEND_URL}/login"
                   style="background: #1e2216; color: #f0edd8; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                  Login Now
                </a>
              </div>
            </div>

            <div style="background: #f9f9f4; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5d8; font-family: Arial, sans-serif;">
              <p style="font-size: 11px; color: #9a9a7e; margin: 0; line-height: 1.6;">
                This is an automated message from FBR Invoice System.
              </p>
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
          <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5d8;">

            <div style="background: #1e2216; padding: 36px 40px;">
              <p style="color: #c8e64c; margin: 0 0 8px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; font-family: Arial, sans-serif;">
                Federal Board of Revenue &middot; e-Invoice System
              </p>
              <h1 style="color: #f0edd8; margin: 0; font-size: 26px; font-weight: 600;">
                ${docType}
              </h1>
            </div>

            <div style="padding: 32px 40px; font-family: Arial, sans-serif;">

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                <tr>
                  <td style="font-size: 13px; color: #1e2216; font-weight: 700;">Verified by FBR</td>
                  <td style="font-size: 13px; color: #9a9a7e; text-align: right;">${new Date(invoice.sentAt).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td colspan="2" style="font-size: 13px; color: #4a4a3a; padding-top: 4px;">
                    FBR Invoice No: <strong style="color: #1e2216;">${invoice.fbrInvoiceNo}</strong>
                  </td>
                </tr>
              </table>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; border-top: 1px solid #e5e5d8; border-bottom: 1px solid #e5e5d8;">
                <tr>
                  <td style="width: 50%; padding: 20px 20px 20px 0; vertical-align: top;">
                    <p style="margin: 0 0 8px 0; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #9a9a7e; font-weight: 700;">Seller</p>
                    <p style="margin: 0; font-size: 14px; color: #1e2216; font-weight: 700;">${business.businessName}</p>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #6b6b52; line-height: 1.6;">
                      NTN: ${business.ntn}<br/>
                      STRN: ${business.strn}
                    </p>
                  </td>
                  <td style="width: 50%; padding: 20px 0 20px 20px; vertical-align: top; border-left: 1px solid #e5e5d8;">
                    <p style="margin: 0 0 8px 0; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #9a9a7e; font-weight: 700;">Buyer</p>
                    <p style="margin: 0; font-size: 14px; color: #1e2216; font-weight: 700;">${toName}</p>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #6b6b52; line-height: 1.6;">
                      ${invoice.buyerNtn ? `NTN: ${invoice.buyerNtn}<br/>` : ''}
                      ${invoice.buyerCnic ? `CNIC: ${invoice.buyerCnic}` : ''}
                    </p>
                  </td>
                </tr>
              </table>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6b6b52;">Invoice Date</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #1e2216; text-align: right;">${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6b6b52; border-top: 1px solid #f0efe8;">Subtotal</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #1e2216; text-align: right; border-top: 1px solid #f0efe8;">PKR ${Number(invoice.totalAmount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6b6b52; border-top: 1px solid #f0efe8;">Sales Tax</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #1e2216; text-align: right; border-top: 1px solid #f0efe8;">PKR ${Number(invoice.totalSalesTax).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 16px 0 0 0; font-size: 15px; font-weight: 700; color: #1e2216; border-top: 2px solid #1e2216;">Grand Total</td>
                  <td style="padding: 16px 0 0 0; font-size: 15px; font-weight: 700; color: #1e2216; text-align: right; border-top: 2px solid #1e2216;">PKR ${grandTotal}</td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #6b6b52; line-height: 1.6; margin: 0; border-left: 3px solid #c8e64c; padding-left: 14px;">
                The full invoice PDF is attached. Scan the QR code inside to verify this invoice on FBR's system.
              </p>

            </div>

            <div style="background: #f9f9f4; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5d8; font-family: Arial, sans-serif;">
              <p style="font-size: 11px; color: #9a9a7e; margin: 0; line-height: 1.6;">
                This email was sent by <strong style="color: #6b6b52;">${business.businessName}</strong> via FBR e-Invoice System<br/>
                NTN: ${business.ntn}
              </p>
            </div>

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