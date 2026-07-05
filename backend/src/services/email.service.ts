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
          <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff;">

            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 36px 32px; text-align: center;">
              <p style="color: #93c5fd; margin: 0 0 6px 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                FBR Invoice System
              </p>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.3px;">
                Invoice Sent Successfully
              </h1>
            </div>

            <div style="padding: 32px;">

              <p style="font-size: 14px; color: #334155; line-height: 1.7; margin: 0 0 24px 0;">
                Your invoice has been successfully submitted to FBR.
              </p>

              <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 28px;">
                <div style="background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #64748b; font-weight: 700;">Invoice Details</p>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 20px; font-size: 13px; color: #64748b;">FBR Invoice Number</td>
                    <td style="padding: 12px 20px; font-size: 13px; color: #0f172a; text-align: right; font-weight: 600;">${fbrInvoiceNo}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 20px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9;">Invoice Date</td>
                    <td style="padding: 12px 20px; font-size: 13px; color: #0f172a; text-align: right; border-top: 1px solid #f1f5f9;">${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 20px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9;">Total Amount</td>
                    <td style="padding: 12px 20px; font-size: 13px; color: #0f172a; text-align: right; border-top: 1px solid #f1f5f9;">PKR ${invoice.totalAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 20px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9;">Total Sales Tax</td>
                    <td style="padding: 12px 20px; font-size: 13px; color: #16a34a; text-align: right; border-top: 1px solid #f1f5f9;">PKR ${invoice.totalSalesTax}</td>
                  </tr>
                </table>
              </div>

            </div>

            <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
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
          <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff;">

            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 36px 32px; text-align: center;">
              <p style="color: #93c5fd; margin: 0 0 6px 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                FBR Invoice System
              </p>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.3px;">
                Invoice Submission Failed
              </h1>
            </div>

            <div style="padding: 32px;">

              <p style="font-size: 14px; color: #334155; line-height: 1.7; margin: 0 0 24px 0;">
                Your invoice could not be submitted to FBR.
              </p>

              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 18px 20px; margin-bottom: 28px;">
                <p style="margin: 0; color: #991b1b; font-weight: 700; font-size: 13px;">Error</p>
                <p style="margin: 6px 0 0 0; color: #b91c1c; font-size: 13px; line-height: 1.6;">${errorMessage}</p>
              </div>

              <p style="font-size: 14px; color: #334155; line-height: 1.7; margin: 0;">
                Please login to your dashboard and resubmit the invoice.
              </p>

            </div>

            <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
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
          <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff;">

            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 36px 32px; text-align: center;">
              <p style="color: #93c5fd; margin: 0 0 6px 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                FBR Invoice System
              </p>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.3px;">
                Reset Your Password
              </h1>
            </div>

            <div style="padding: 32px;">

              <p style="font-size: 14px; color: #334155; line-height: 1.7; margin: 0 0 24px 0;">
                We received a request to reset the password for your account. Click the button below to choose a new password.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}"
                   style="background: #1e3a8a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                  Reset Password
                </a>
              </div>

              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-bottom: 8px;">
                <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
                  This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
                </p>
              </div>

            </div>

            <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
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
          <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff;">

            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 36px 32px; text-align: center;">
              <p style="color: #93c5fd; margin: 0 0 6px 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                FBR Invoice System
              </p>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.3px;">
                Welcome to FBR Invoice System
              </h1>
            </div>

            <div style="padding: 32px;">

              <p style="font-size: 14px; color: #334155; line-height: 1.7; margin: 0 0 12px 0;">
                Your account has been created successfully.
              </p>
              <p style="font-size: 14px; color: #334155; line-height: 1.7; margin: 0 0 24px 0;">
                You can now log in and start sending invoices to FBR digitally.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.FRONTEND_URL}/login"
                   style="background: #1e3a8a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                  Login Now
                </a>
              </div>

            </div>

            <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
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
          <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff;">

            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 36px 32px; text-align: center;">
              <p style="color: #93c5fd; margin: 0 0 6px 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">
                Federal Board of Revenue &middot; e-Invoice System
              </p>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.3px;">
                ${docType}
              </h1>
            </div>

            <div style="padding: 32px;">

              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 18px 20px; margin-bottom: 28px;">
                <p style="margin: 0; color: #166534; font-weight: 700; font-size: 14px;">Verified by FBR</p>
                <p style="margin: 6px 0 0 0; color: #15803d; font-size: 13px;">FBR Invoice No: <strong>${invoice.fbrInvoiceNo}</strong></p>
                <p style="margin: 4px 0 0 0; color: #4ade80; font-size: 11px;">Submitted ${new Date(invoice.sentAt).toLocaleString()}</p>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                <tr>
                  <td style="width: 50%; padding: 0 12px 0 0; vertical-align: top;">
                    <p style="margin: 0 0 8px 0; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Seller</p>
                    <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">${business.businessName}</p>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.6;">
                      NTN: ${business.ntn}<br/>
                      STRN: ${business.strn}
                    </p>
                  </td>
                  <td style="width: 50%; padding: 0 0 0 12px; vertical-align: top; border-left: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Buyer</p>
                    <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">${toName}</p>
                    <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.6;">
                      ${invoice.buyerNtn ? `NTN: ${invoice.buyerNtn}<br/>` : ''}
                      ${invoice.buyerCnic ? `CNIC: ${invoice.buyerCnic}` : ''}
                    </p>
                  </td>
                </tr>
              </table>

              <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 28px;">
                <div style="background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #64748b; font-weight: 700;">Invoice Summary</p>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 20px; font-size: 13px; color: #64748b;">Invoice Date</td>
                    <td style="padding: 12px 20px; font-size: 13px; color: #0f172a; text-align: right;">${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 20px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9;">Subtotal</td>
                    <td style="padding: 12px 20px; font-size: 13px; color: #0f172a; text-align: right; border-top: 1px solid #f1f5f9;">PKR ${Number(invoice.totalAmount).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 20px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9;">Sales Tax</td>
                    <td style="padding: 12px 20px; font-size: 13px; color: #16a34a; text-align: right; border-top: 1px solid #f1f5f9;">PKR ${Number(invoice.totalSalesTax).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 20px; font-size: 14px; font-weight: 700; color: #0f172a; background: #f8fafc; border-top: 2px solid #e2e8f0;">Grand Total</td>
                    <td style="padding: 16px 20px; font-size: 16px; font-weight: 700; color: #0f172a; background: #f8fafc; text-align: right; border-top: 2px solid #e2e8f0;">PKR ${grandTotal}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-bottom: 8px;">
                <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
                  The full invoice PDF is attached. Scan the QR code inside to verify this invoice on FBR's system.
                </p>
              </div>

            </div>

            <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.6;">
                This email was sent by <strong style="color: #64748b;">${business.businessName}</strong> via FBR e-Invoice System<br/>
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