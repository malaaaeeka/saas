import axios from 'axios'
import https from 'https'
import logger from '../utils/logger'

const FBR_SANDBOX_URL = 'https://esp.fbr.gov.pk:8244/DigitalInvoicing/v1/PostInvoiceData_v1'
const FBR_PRODUCTION_URL = 'https://gw.fbr.gov.pk/pdi/v1/api/DigitalInvoicing/PostInvoiceData_v1'

class FBRService {

  private getUrl(): string {
    return process.env.FBR_ENVIRONMENT === 'production'
      ? FBR_PRODUCTION_URL
      : FBR_SANDBOX_URL
  }

  private getAxiosInstance() {
    const agent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    })

    return axios.create({
      httpAgent: undefined,
      httpsAgent: agent,
      timeout: 30000
    })
  }

  async postInvoice(invoiceData: any, securityToken: string) {
    // MOCK RESPONSE FOR TESTING
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_FBR === 'true') {
      logger.info('MOCK FBR: Returning test response')
      return {
        success: true,
        fbrInvoiceNo: `PKR-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    }

    try {
      const axiosInstance = this.getAxiosInstance()

      const response = await axiosInstance.post(
        this.getUrl(),
        invoiceData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${securityToken}`
          }
        }
      )

      if (response.data.statusCode === 200) {
        return {
          success: true,
          fbrInvoiceNo: response.data.result,
          timestamp: response.data.timestamp
        }
      } else {
        return {
          success: false,
          error: response.data.errorMessage || 'FBR rejected the invoice'
        }
      }

    } catch (error: any) {
      logger.error('FBR API Error:', error.message)
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message || 'FBR connection failed'
      }
    }
  }

  formatInvoice(invoice: any, business: any) {
    const totalQuantity = invoice.items.reduce(
      (sum: number, item: any) => sum + Number(item.quantity), 0
    )

    return {
      InvoiceType: this.getInvoiceTypeCode(invoice.invoiceType),
      POSID: parseInt(business.posId || '0'),
      USIN: invoice.id,
      DateTime: this.formatDateTime(invoice.invoiceDate),
      BuyerNTN: invoice.buyerNtn || '',
      BuyerCNIC: invoice.buyerCnic || '',
      BuyerName: invoice.buyerName || '',
      BuyerPhoneNumber: '',
      SaleType: invoice.saleType,
      RefUSIN: '',
      TotalBillAmount: Number(invoice.totalAmount),
      TotalQuantity: totalQuantity,
      TotalSaleValue: Number(invoice.totalAmount),
      TotalTaxCharged: Number(invoice.totalSalesTax),
      Discount: Number(invoice.totalDiscount || 0),
      FurtherTax: 0,
      PaymentMode: 1,
      TaxRate: 0,
      Items: invoice.items.map((item: any, index: number) => ({
        ItemCode: item.productCode || `ITEM-${index + 1}`,
        ItemName: item.description,
        Quantity: Number(item.quantity),
        PCTCode: item.hsCode,
        TaxRate: 17,
        SaleValue: Number(item.totalAmount),
        Discount: Number(item.discount || 0),
        FurtherTax: 0,
        TaxCharged: Number(item.salesTax),
        TotalAmount: Number(item.totalAmount) + Number(item.salesTax),
        InvoiceType: this.getInvoiceTypeCode(invoice.invoiceType),
        UOM: item.uom || 'U1000003',
        RefUSIN: '',
        SRNScheduleCode: item.sroSchedule || 'S1000059'
      }))
    }
  }

  private getInvoiceTypeCode(type: string): number {
    const codes: any = {
      'SALE': 1,
      'PURCHASE': 2,
      'DEBIT_NOTE': 3,
      'CREDIT_NOTE': 4
    }
    return codes[type] || 1
  }

  private formatDateTime(date: Date): string {
    return new Date(date)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 23)
  }
}

export default new FBRService()