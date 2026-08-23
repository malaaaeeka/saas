import PDFDocument from 'pdfkit'
import prisma from '../config/database'

const typeLabels: Record<string, string> = {
  SALE: 'Sale', PURCHASE: 'Purchase', CREDIT_NOTE: 'Credit Note', DEBIT_NOTE: 'Debit Note'
}

export async function processInvoiceExport(jobId: string, where: any) {
  try {
    const totalCount = await prisma.invoice.count({ where })

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))

    const donePromise = new Promise<void>((resolve, reject) => {
      doc.on('end', () => resolve())
      doc.on('error', reject)
    })

    doc.fontSize(16).font('Helvetica').fillColor('#141414').text('Invoices', 30, 30)
    doc.fillColor('black')

    const tableLeft = 30
    let tableTop = 60

    const baseCols = [
      { key: 'id',     label: 'Invoice ID', w: 90 },
      { key: 'date',   label: 'Date',       w: 60 },
      { key: 'type',   label: 'Type',       w: 60 },
      { key: 'buyer',  label: 'Buyer',      w: 130 },
      { key: 'amount', label: 'Amount',     w: 80 },
      { key: 'tax',    label: 'Tax',        w: 80 },
      { key: 'status', label: 'Status',     w: 55 },
      { key: 'fbrNo',  label: 'FBR No.',    w: 120 },
    ]

    const availableWidth = doc.page.width - tableLeft * 2
    const baseTotalWidth = baseCols.reduce((sum, c) => sum + c.w, 0)
    const cols = baseCols.map(c => ({ ...c, w: c.w * (availableWidth / baseTotalWidth) }))

    let runningX = tableLeft
    const colX: number[] = []
    cols.forEach(c => { colX.push(runningX); runningX += c.w })
    const tableWidth = runningX - tableLeft

    const drawHeader = (y: number) => {
      const headerHeight = 20
      doc.rect(tableLeft, y, tableWidth, headerHeight).fill('#e5e5e5')
      doc.fillColor('#141414')
      doc.fontSize(8).font('Helvetica-Bold')
      cols.forEach((c, i) => doc.text(c.label, colX[i] + 4, y + 6, { width: c.w - 8 }))
      doc.fillColor('black')
      return y + headerHeight
    }

    tableTop = drawHeader(tableTop)
    doc.font('Helvetica').fontSize(7.5)

    const BATCH_SIZE = 500
    let processed = 0
    let rowIdx = 0

    while (processed < totalCount) {
      const batch = await prisma.invoice.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: processed, take: BATCH_SIZE
      })
      if (batch.length === 0) break

      batch.forEach(inv => {
        if (tableTop > doc.page.height - 60) {
          doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' })
          tableTop = drawHeader(30)
          doc.font('Helvetica').fontSize(7.5)
        }
        const rowHeight = 18
        const rowY = tableTop
        if (rowIdx % 2 === 0) doc.rect(tableLeft, rowY, tableWidth, rowHeight).fill('#f5f5f5')
        doc.fillColor('#505050')

        const valueMap: Record<string, string> = {
          id: inv.id.slice(0, 12) + '...',
          date: new Date(inv.invoiceDate).toLocaleDateString(),
          type: typeLabels[inv.invoiceType] || inv.invoiceType,
          buyer: inv.buyerName || 'Walk-in Customer',
          amount: `PKR ${Number(inv.totalAmount).toFixed(2)}`,
          tax: `PKR ${Number(inv.totalSalesTax).toFixed(2)}`,
          status: inv.status,
          fbrNo: inv.fbrInvoiceNo || '—'
        }
        cols.forEach((c, i) => doc.text(valueMap[c.key], colX[i] + 4, rowY + 5, { width: c.w - 8 }))
        doc.fillColor('black')
        tableTop += rowHeight
        rowIdx++
      })

      processed += batch.length
    }

    doc.end()
    await donePromise

    const fileData = Buffer.concat(chunks)
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', fileData, filename: 'invoices.pdf', completedAt: new Date() }
    })
  } catch (error: any) {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: error.message || 'Export failed', completedAt: new Date() }
    })
  }
}

export async function processBuyerExport(jobId: string, where: any) {
  try {
    const totalCount = await prisma.buyer.count({ where })

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))

    const donePromise = new Promise<void>((resolve, reject) => {
      doc.on('end', () => resolve())
      doc.on('error', reject)
    })

    doc.fontSize(16).font('Helvetica').fillColor('#141414').text('Buyers', 30, 30)
    doc.fillColor('black')

    const tableLeft = 30
    let tableTop = 60

    const baseCols = [
      { key: 'sr',       label: 'Serial No.', w: 45  },
      { key: 'name',     label: 'Name',       w: 95  },
      { key: 'ntn',      label: 'NTN',        w: 60  },
      { key: 'cnic',     label: 'CNIC',       w: 80  },
      { key: 'type',     label: 'Type',       w: 80  },
      { key: 'province', label: 'Province',   w: 85  },
      { key: 'phone',    label: 'Phone',      w: 60  },
      { key: 'email',    label: 'Email',      w: 85  },
      { key: 'address',  label: 'Address',    w: 100 },
    ]

    const availableWidth = doc.page.width - tableLeft * 2
    const baseTotalWidth = baseCols.reduce((sum, c) => sum + c.w, 0)
    const cols = baseCols.map(c => ({ ...c, w: c.w * (availableWidth / baseTotalWidth) }))

    let runningX = tableLeft
    const colX: number[] = []
    cols.forEach(c => { colX.push(runningX); runningX += c.w })
    const tableWidth = runningX - tableLeft

    const drawHeader = (y: number) => {
      const headerHeight = 20
      doc.rect(tableLeft, y, tableWidth, headerHeight).fill('#e5e5e5')
      doc.fillColor('#141414')
      doc.fontSize(8).font('Helvetica-Bold')
      cols.forEach((c, i) => doc.text(c.label, colX[i] + 4, y + 6, { width: c.w - 8 }))
      doc.fillColor('black')
      return y + headerHeight
    }

    tableTop = drawHeader(tableTop)
    doc.font('Helvetica').fontSize(7.5)

    const BATCH_SIZE = 500
    let processed = 0
    let rowIdx = 0

    while (processed < totalCount) {
      const batch = await prisma.buyer.findMany({
        where, orderBy: { buyerName: 'asc' }, skip: processed, take: BATCH_SIZE
      })
      if (batch.length === 0) break

      batch.forEach(b => {
        if (tableTop > doc.page.height - 60) {
          doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' })
          tableTop = drawHeader(30)
          doc.font('Helvetica').fontSize(7.5)
        }
        const rowHeight = 18
        const rowY = tableTop
        if (rowIdx % 2 === 0) doc.rect(tableLeft, rowY, tableWidth, rowHeight).fill('#f5f5f5')
        doc.fillColor('#505050')

        const valueMap: Record<string, string> = {
          sr: String(rowIdx + 1),
          name: b.buyerName || '—',
          ntn: b.buyerNtn || '—',
          cnic: b.buyerCnic || '—',
          type: b.buyerType || 'Unregistered',
          province: b.province || '—',
          phone: b.phone || '—',
          email: b.email || '—',
          address: b.address || '—'
        }
        cols.forEach((c, i) => doc.text(valueMap[c.key], colX[i] + 4, rowY + 5, { width: c.w - 8 }))
        doc.fillColor('black')
        tableTop += rowHeight
        rowIdx++
      })

      processed += batch.length
    }

    doc.end()
    await donePromise

    const fileData = Buffer.concat(chunks)
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', fileData, filename: 'buyers.pdf', completedAt: new Date() }
    })
  } catch (error: any) {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: error.message || 'Export failed', completedAt: new Date() }
    })
  }
}

export async function processProductExport(jobId: string, where: any) {
  try {
    const totalCount = await prisma.product.count({ where })

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))

    const donePromise = new Promise<void>((resolve, reject) => {
      doc.on('end', () => resolve())
      doc.on('error', reject)
    })

    doc.fontSize(16).font('Helvetica').fillColor('#141414').text('Products', 30, 30)
    doc.fillColor('black')

    const tableLeft = 30
    let tableTop = 60

    const baseCols = [
      { key: 'sr',      label: 'Serial No.',  w: 50  },
      { key: 'desc',    label: 'Description', w: 160 },
      { key: 'hsCode',  label: 'HS Code',     w: 60  },
      { key: 'uom',     label: 'UoM',         w: 45  },
      { key: 'rate',    label: 'Rate',        w: 75  },
      { key: 'taxRate', label: 'Tax Rate',    w: 55  },
      { key: 'sro',     label: 'SRO',         w: 100 },
      { key: 'itemSNo', label: 'Item S. No.', w: 75  },
    ]

    const availableWidth = doc.page.width - tableLeft * 2
    const baseTotalWidth = baseCols.reduce((sum, c) => sum + c.w, 0)
    const cols = baseCols.map(c => ({ ...c, w: c.w * (availableWidth / baseTotalWidth) }))

    let runningX = tableLeft
    const colX: number[] = []
    cols.forEach(c => { colX.push(runningX); runningX += c.w })
    const tableWidth = runningX - tableLeft

    const drawHeader = (y: number) => {
      const headerHeight = 20
      doc.rect(tableLeft, y, tableWidth, headerHeight).fill('#e5e5e5')
      doc.fillColor('#141414')
      doc.fontSize(8).font('Helvetica-Bold')
      cols.forEach((c, i) => doc.text(c.label, colX[i] + 4, y + 6, { width: c.w - 8 }))
      doc.fillColor('black')
      return y + headerHeight
    }

    tableTop = drawHeader(tableTop)
    doc.font('Helvetica').fontSize(7.5)

    const BATCH_SIZE = 500
    let processed = 0
    let rowIdx = 0

    while (processed < totalCount) {
      const batch = await prisma.product.findMany({
        where, orderBy: { description: 'asc' }, skip: processed, take: BATCH_SIZE
      })
      if (batch.length === 0) break

      batch.forEach(p => {
        if (tableTop > doc.page.height - 60) {
          doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' })
          tableTop = drawHeader(30)
          doc.font('Helvetica').fontSize(7.5)
        }
        const rowHeight = 18
        const rowY = tableTop
        if (rowIdx % 2 === 0) doc.rect(tableLeft, rowY, tableWidth, rowHeight).fill('#f5f5f5')
        doc.fillColor('#505050')

        const valueMap: Record<string, string> = {
          sr: String(rowIdx + 1),
          desc: p.description || '—',
          hsCode: p.hsCode || '—',
          uom: p.uom || '—',
          rate: p.rate !== null ? `PKR ${Number(p.rate).toFixed(2)}` : '—',
          taxRate: p.taxRate || '—',
          sro: p.sroSchedule || '—',
          itemSNo: p.itemSNo || '—'
        }
        cols.forEach((c, i) => doc.text(valueMap[c.key], colX[i] + 4, rowY + 5, { width: c.w - 8 }))
        doc.fillColor('black')
        tableTop += rowHeight
        rowIdx++
      })

      processed += batch.length
    }

    doc.end()
    await donePromise

    const fileData = Buffer.concat(chunks)
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', fileData, filename: 'products.pdf', completedAt: new Date() }
    })
  } catch (error: any) {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: error.message || 'Export failed', completedAt: new Date() }
    })
  }
}