'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import HsCodeAutocomplete from '@/components/ui/HsCodeAutocomplete'
import ClientAutocomplete from '@/components/ui/ClientAutocomplete'
import { useRouter, useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import StyledSelect, { toOptions } from '@/components/ui/StyledSelect'





const PROVINCES = [
  'AZAD JAMMU AND KASHMIR',
  'BALOCHISTAN',
  'CAPITAL TERRITORY',
  'GILGIT BALTISTAN',
  'KHYBER PAKHTUNKHWA',
  'PUNJAB',
  'SINDH',
  'FATA/PATA'
]

const BUYER_TYPES = [
  'Registered',
  'Unregistered',
  'Unregistered Distributor',
  'Retail Consumer'
]

const DOCUMENT_TYPES = [
  'Sale Invoice',
  'Credit Note',
  'Debit Note',
  'STWH'
]

const SALE_TYPES = [
  'Goods at standard rate (default)',
  'Goods at Reduced Rate',
  'Goods at zero-rate',
  'Petroleum Products',
  'Electricity Supply to Retailers',
  'SIM',
  'Gas to CNG stations',
  'Mobile Phones',
  'Rerollable scrap by ship breakers',
  'Processing/Conversion of Goods',
  '3rd Schedule Goods',
  'Goods (FED in ST Mode)',
  'Services (FED in ST Mode)',
  'Services',
  'Exempt goods',
  'DTRE goods',
  'Cotton ginners',
  'Electric Vehicle',
  'Cement /Concrete Block',
  'Telecommunication services',
  'Steel melting and re-rolling',
  'Ship breaking',
  'Potassium Chlorate',
  'Non-Adjustable Supplies',
  'Goods as per SRO.297(|)/2023',
  'CNG Sales',
  'Toll Manufacturing'
]

const RATES: string[] = [
  '0%', '0.20%', '0.25%', '0.46%', '0.50%', '0.79%', '1%', '1.43%', '1.5%',
  '1.63%', '2%', '2.5%', '2.7%', '2.74%', '3%', '3.17%', '3.67%', '4.5%',
  '4.77%', '5%', '5.3%', '5.44%', '6.5%', '6.7%', '6.75%', '6.84%', '7%',
  '7.2%', '7.37%', '7.5%', '7.56%', '8%', '8.19%', '8.3%', '8.5%', '9.08%',
  '9.15%', '10%', '10.07%', '10.32%', '10.54%', '10.77%', '11.64%', '12%',
  '12.5%', '12.75%', '13%', '14%', '15%', '15.44%', '16%', '16.4%', '17%',
  '18%', '18.5%', '19.5%', '20%', '25%',
  '100/SqY',
  '17% along with rupees 60 per kilogram',
  '18% along with rupees 60 per kilogram',
  '17% along with rupees 90 per kilogram',
  '200/bill',
  '50/SqY',
  'DTRE',
  'Exempt',
  'Rs.10', 'Rs.10.58', 'Rs.10.65', 'Rs.1000/IMEI', 'Rs.10400/MT', 'Rs.12.89',
  'Rs.13.9', 'Rs.13/KWH', 'Rs.130', 'Rs.14.48', 'Rs.1500/IMEI', 'Rs.1680',
  'Rs.1740', 'Rs.18.47', 'Rs.18.57', 'Rs.2', 'Rs.200', 'Rs.25.16', 'Rs.250',
  'Rs.250/IMEI', 'Rs.29.57', 'Rs.3', 'Rs.3.38', 'Rs.3.60', 'Rs.300/IMEI',
  'Rs.4.72', 'Rs.4.76', 'Rs.4/KWH', 'Rs.425/MT', 'Rs.700/MT', 'Rs.5',
  'Rs.5.58', 'Rs.5400', 'Rs.5600/MT', 'Rs.5862/MT', 'Rs.650/IMEI',
  'Rs.6700/MT', 'Rs.7/KWH', 'Rs.9.36', 'Rs.9.63', 'Rs.9.89', 'Rs.9/KWH',
  'Rs.9270', 'Rs.9500/MT', 'Rs.1000', 'Rs. 16500 per KG', 'Rs. 2000 per Fan'
]

const UOMS = [
  'MT', 'Bill of lading', 'SET', 'NO', '1000 kWh', 'KWH', '40KG', 'Liter',
  'SqY', 'Bag', 'KG', 'MMBTU', 'Meter', 'Carat', 'Cubic Metre', 'Dozen',
  'Gram', 'Gallon', 'Kilogram', 'Pound', 'Timber Logs', 'Packs', 'Pair',
  'Square Foot', 'Square Metre', 'Thousand Unit', 'Mega Watt', 'Foot',
  'Barrels', 'Numbers, pieces, units'
]

const SRO_SCHEDULES: string[] = [
  "01(I)/2022", "1007(I)/2005", "1125(I)/2011", "1167(I)/2018", "1180(I)/2016",
  "1212(I)/2018", "125(I)/2017", "1308(I)/2018", "1450(I)/2021", "1579(1)/2021",
  "1604(I)/2021", "1636(1)/2022", "164(I)/2010", "172(I)/2006", "183(I)/2022",
  "188(I)/2015", "1st Schedule FED", "21(I)/2017", "213(I)/2013", "223(I)/2017",
  "237(I)/2020", "253(I)/2019", "292(I)/2017", "297(I)/2023-Table-I",
  "297(I)/2023-Table-II", "321(I)/2022", "326(I)/2008", "327(I)/2008",
  "398(I)/2015", "3rd Schd Table II", "3rd Schedule goods", "408(I)/2012",
  "408(I)/2017", "484(I)/2015", "495(I)/2016", "499(I)/2013", "501(I)/2013",
  "525(I)/2008", "539(I)/2008", "542(I)/2008", "549(I)/2008", "551(I)/2008",
  "572(I)/2014", "581(1)/2024", "581(I)/2017", "587(I)/2017", "590(I)/2017",
  "5th Schedule", "608(I)/2012", "641(I)/2017", "646(I)/2005", "657(I)/2013",
  "670(I)/2013", "678(I)/2004", "6th Schd Table I", "6th Schd Table II",
  "6th Schd Table III", "6th Schedule", "713(I)/2017", "727(I)/2011",
  "757(I)/2017", "76(I)/2008", "760(I)/2012", "777(I)2018", "781(I)2018",
  "79(I)/2012", "802(I)/2009", "811(I)/2009", "863(I)/2007", "867(I)/2017",
  "88(I)/2022", "880(I)/2007", "896(I)/2013", "898(I)/2013", "8th Schedules",
  "91(I)/2017", "946(1)/2013", "984(I)/2017", "9th Schedule", "9th Schedules",
  "DTRE", "EIGHTH SCHEDULE Table 1", "EIGHTH SCHEDULE Table 2",
  "FED 3rd Schd Table I", "FED 3rd Schd Table II", "FIFTH SCHEDULE", "ICTO",
  "ICTO TABLE I", "ICTO TABLE II", "NINTH SCHEDULE", "Section 4(b)",
  "SECTION 49", "SRO 342 (I)/2002", "Zero Rated Elec.", "Zero Rated Gas",
  "S.R.O. 1217(I)/2025"
]

const ITEM_SR_NOS: string[] = [
  "-", "1", "1(A)", "1(B)", "1(E)", "1(F)", "1(G)", "1(i)", "1(i)(a)", "1(i)(b)",
  "1(i)(i)", "1(ii)", "1(ii)(a)", "1(ii)(b)", "1(ii)(ii)(a)", "1(ii)(ii)(b)",
  "1(iii)", "1(iv)", "1(v)", "1(vi)", "10", "100", "100A", "100A((i))",
  "100A((ii))", "100A((iii))", "100B", "100B((i))", "100B((ii))", "100B((iii))",
  "100B((iv))", "100B((v))", "100B((vi))", "100C", "101", "102", "103", "104",
  "104(a)", "104(b)", "104(c)", "104(d)", "104(e)", "104(f)", "104(g)", "104(h)",
  "105", "106", "107", "108", "108(a)", "108(b)", "108(c)", "108(d)", "108(e)",
  "108(f)", "108(g)", "108(h)", "108(i)", "108(j)", "108(k)", "109", "11",
  "11(a)", "11(b)", "11(i)", "11(ii)", "11(iii)", "11(iv)", "11(v)", "11(vi)",
  "11(vii)", "11(viii)", "110", "110(a)", "110(b)", "110(c)", "110(d)", "110(e)",
  "110(f)", "110(g)", "110(h)", "110(i)", "110(j)", "111", "112", "112A",
  "112A(i)", "112A(ii)", "112A(iii)", "112A(iv)", "112A(ix)", "112A(v)",
  "112A(vi)", "112A(vii)", "112A(viii)", "112A(x)", "112A(xi)", "112A(xii)",
  "112A(xiii)", "112A(xiv)", "112A(xix)", "112A(xv)", "112A(xvi)", "112A(xvii)",
  "112A(xviii)", "112A(xx)", "112A(xxi)", "112A(xxii)", "112A(xxiii)",
  "112A(xxiv)", "112A(xxv)", "112B", "112B(i)", "112B(ii)", "112B(iii)",
  "112B(iv)", "112B(v)", "112B(vi)", "112B(vii)", "112C", "112C(i)", "112C(ii)",
  "112C(iii)", "112C(iv)", "112C(ix)", "112C(v)", "112C(vi)", "112C(vii)",
  "112C(viii)", "112C(x)", "112D", "112E", "112F", "112G", "112H", "112H(i)",
  "112H(ii)", "112H(iii)", "112H(iv)", "112H(ix)", "112H(v)", "112H(vi)",
  "112H(vii)", "112H(viii)", "112H(x)", "112H(xi)", "112I", "112I(i)", "112J",
  "112J(i)", "112J(ii)", "112J(iii)", "112J(iv)", "112J(ix)", "112J(v)",
  "112J(vi)", "112J(vii)", "112J(viii)", "112J(viii)(a)", "112J(viii)(b)",
  "112J(viii)(c)", "112J(x)", "112J(xi)", "112J(xii)", "112K", "112K(i)",
  "112K(ii)", "112K(iii)", "112K(iv)", "112K(ix)", "112K(v)", "112K(vi)",
  "112K(vii)", "112K(viii)", "112K(x)", "112K(xi)", "112K(xii)", "112K(xiii)",
  "112K(xiv)", "112K(xv)", "112K(xvi)", "112K(xvii)", "112K(xviii)", "112L",
  "113", "113(i)", "113(ii)", "113(iii)", "114", "114(i)", "114(ii)", "115",
  "116", "117", "118", "119", "12", "12(xix)", "12(xvii)", "12(xx)", "12(xxi)",
  "12(xxii)", "12(xxiii)", "12(xxiv)", "12(xxv)", "12(xxvi)", "12(xxvii)",
  "120", "121", "122", "123", "124", "125", "126", "127", "128", "129", "13",
  "130", "131", "132", "133", "134", "135", "136", "137", "138", "139", "14",
  "14(1)", "14(1)(i)", "14(1)(ii)", "14(1)(iii)", "14(1)(iv)", "14(1)(v)",
  "14(1)(vi)", "14(2)", "140", "141", "142", "143", "143(i)", "143(i)(a)",
  "143(i)(b)", "143(i)(c)", "143(i)(d)", "144", "145", "145(i)", "145(ii)",
  "145(iii)", "145(iv)", "145(ix)", "145(v)", "145(vi)", "145(vii)", "145(viii)",
  "145(x)", "146", "146(a)", "146(b)", "146(c)", "146(d)", "146(e)", "146(f)",
  "146(g)", "146(h)", "146(i)", "146(j)", "147", "148", "149", "14A", "14A(10)",
  "14A(11)", "14A(12)", "14A(12a)", "14A(12b)", "14A(12b)(i)", "14A(12b)(ii)",
  "14A(12b)(iii)", "14A(12b)(iv)", "14A(12b)(v)", "14A(12b)(vi)", "14A(13)",
  "14A(14)", "14A(14)(i)", "14A(14)(ii)", "14A(14)(iii)", "14A(14)(iv)",
  "14A(14)(ix)", "14A(14)(v)", "14A(14)(vi)", "14A(14)(vii)", "14A(14)(viii)",
  "14A(14)(x)", "14A(1a)", "14A(1b)", "14A(1b)(i)", "14A(1b)(ii)", "14A(1b)(iii)",
  "14A(1b)(iv)", "14A(1b)(v)", "14A(1b)(vi)", "14A(2a)", "14A(2b)", "14A(2b)(i)",
  "14A(2b)(ii)", "14A(2b)(iii)", "14A(2b)(iv)", "14A(2b)(v)", "14A(3a)",
  "14A(3b)", "14A(3b)(i)", "14A(3b)(ii)", "14A(3b)(iii)", "14A(3b)(iv)",
  "14A(3b)(v)", "14A(3b)(vi)", "14A(4a)", "14A(4b)", "14A(4b)(i)", "14A(4b)(ii)",
  "14A(4b)(iii)", "14A(4b)(iv)", "14A(4b)(v)", "14A(5)", "14A(6a)", "14A(6b)",
  "14A(6b)(i)", "14A(6b)(ii)", "14A(6b)(iii)", "14A(6b)(iv)", "14A(6c)",
  "14A(6c)(i)", "14A(6c)(ii)", "14A(6c)(iii)", "14A(6c)(iv)", "14A(6c)(v)",
  "14A(6c)(vi)", "14A(7a)", "14A(7b)", "14A(7b)(i)", "14A(7b)(ii)", "14A(7b)(iii)",
  "14A(7b)(iv)", "14A(7b)(ix)", "14A(7b)(v)", "14A(7b)(vi)", "14A(7b)(vii)",
  "14A(7b)(viii)", "14A(7b)(x)", "14A(7b)(xi)", "14A(8)", "14A(8)(i)",
  "14A(8)(ii)", "14A(8)(iii)", "14A(8)(iv)", "14A(8)(v)", "14A(8)(vi)",
  "14A(8)(vii)", "14A(8)(viii)", "14A(9)", "15", "15(a)", "15(b)", "15(c.)",
  "15(i)", "15(ii)", "15(iii)", "15(iv)", "15(ix)", "15(v)", "15(vi)", "15(vii)",
  "15(viii)", "15(x)", "15(xi)", "15(xii)", "15(xiii)", "15(xiv)", "15(xv)",
  "15(xvi)", "150", "150(a)", "150(b)", "151(a)", "151(b)", "152", "153", "154",
  "155", "156", "159", "15A(i)", "15A(ii)", "15A(iii)", "15A(iv)", "16", "160",
  "163", "164", "165", "166", "167", "168", "169", "17", "170", "171", "172",
  "173", "174", "175", "176", "176(i)", "176(ii)", "176(iii)", "176(iv)", "177",
  "178", "179", "18", "18(i)", "18(ii)", "18(iii)", "18(iv)", "18(ix)", "18(v)",
  "18(vi)", "18(vii)", "18(viii)", "18(x)", "18(xi)", "18(xii)", "18(xiii)",
  "18(xiv)", "18(xix)", "18(xv)", "18(xvi)", "18(xvii)", "18(xviii)", "18(xx)",
  "18(xxi)", "180", "181", "19", "2", "2(i)", "2(ii)", "2(ii)(a)", "2(ii)(b)",
  "2(iii)", "20", "21", "22", "23", "24", "25", "26", "26(i)", "26(ii)",
  "26(iii)", "26(iv)", "26(ix)", "26(v)", "26(vi)", "26(vii)", "26(viii)",
  "26(x)", "26(xi)", "26(xii)", "26(xiii)", "26(xiv)", "26(xix)", "26(xv)",
  "26(xvi)", "26(xvii)", "26(xviii)", "27", "27(i)", "27(ii)", "27(iii)",
  "27(iv)", "27(v)", "27(vi)", "27(vii)", "28", "28(i)", "28(ii)", "28(iii)",
  "28(iv)", "28(v)", "28(vi)", "29", "29(i)", "29(ii)", "29(iii)", "29(iv)",
  "29(ix)", "29(v)", "29(vi)", "29(vii)", "29(viii)", "29(x)", "29(xi)",
  "29(xii)", "29(xiii)", "29(xiv)", "29(xv)", "29(xvi)", "29(xvii)", "29(xviii)",
  "29C", "2A", "2A(i)", "2A(ii)", "2A(iii)", "2A(iv)", "2A(ix)", "2A(v)",
  "2A(vi)", "2A(vii)", "2A(viii)", "2B", "2B(i)", "2B(ii)", "2B(iii)", "2C",
  "2C(i)", "2C(ii)", "2D", "2D(i)", "2D(ii)", "2E", "2F", "3", "3(1A)", "3(i)",
  "3(ii)", "30", "30(i)", "30(ii)", "31", "32", "33", "34", "34(1)", "34(2)",
  "34(3)", "34(4)", "35", "36", "37", "38", "39", "4", "4(1)", "4(2)", "40",
  "41", "42", "43", "44", "45", "45(i)", "45(ii)", "45(iii)", "45(iv)", "45v",
  "45vi", "46", "47", "48", "49", "5", "5(i)", "5(ii)", "50", "51", "52", "52A",
  "53", "53(i)", "53(ii)", "53(iii)", "53(iv)", "53(ix)", "53(v)", "53(vi)",
  "53(vii)", "53(viii)", "53(x)", "53(xi)", "53(xii)", "53(xiii)", "53(xiv)",
  "53(xix)", "53(xv)", "53(xvi)", "53(xvii)", "53(xviii)", "54", "55", "56",
  "56(i)", "56(ii)", "57", "58", "59", "6", "6(A)", "6(A)(i)", "6(A)(ii)",
  "6(A)(iii)", "6(A)(iv)", "6(A)(ix)", "6(A)(v)", "6(A)(vi)", "6(A)(vii)",
  "6(A)(viii)", "6(A)(x)", "6(i)", "6(ii)", "60", "61", "62", "63", "64", "65",
  "66", "67", "68", "69", "7", "7(i)", "7(ii)", "70", "70(i)", "70(ii)",
  "70(iii)", "70(iv)", "70(v)", "70(vi)", "71", "72", "73", "73(a)", "73(b)",
  "73A", "74", "75", "76", "77", "78", "79", "8", "8(1)", "8(2)", "8(3)", "8(4)",
  "8(5)", "8(i)", "8(i)(a)", "8(i)(b)", "8(i)(c)", "8(ii)", "80", "81", "82",
  "83", "84", "84(i)", "84(ii)", "84(iii)", "84(iv)", "84(v)", "84(vi)",
  "84(vii)", "85", "86", "87", "88", "89", "8A", "9", "9(i)", "9(ii)", "9(iii)",
  "9(iv)", "9(ix)", "9(v)", "9(vi)", "9(vii)", "9(viii)", "9(x)", "9(xi)",
  "9(xii)", "9(xiii)", "9(xiv)", "9(xix)", "9(xv)", "9(xvi)", "9(xvii)",
  "9(xviii)", "9(xx)", "9(xxi)", "9(xxii)", "9(xxiii)", "90", "91", "92", "93",
  "94", "95", "96", "97", "98", "99", "Region-I", "Region-II"
]

const REASONS: string[] = [
  'Cancellation of supply',
  'Return of goods',
  'Change in nature of supply',
  'Change in value of supply',
  'Change in amount of tax',
  'Others',
  'Adjustment given to Steel Melters'
]

const PETROLEUM_LEVY_OPTIONS: string[] = [
  'Direct Sale',
  'Retail Sale'
]

function rateToPercent(rate: string): number | null {
  const match = rate.match(/^(\d+(\.\d+)?)%/)
  if (match) return parseFloat(match[1]) / 100
  return null
}

// Coerces any value (string, empty string, number, undefined) into a safe number.
// Used everywhere item fields are summed or sent to the backend, since inputs
// store raw strings while typing.
function toNum(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const NUMERIC_ITEM_FIELDS = [
  'quantity', 'rate', 'totalAmount', 'salesTax', 'fixedNotifiedValue',
  'extraTax', 'furtherTax', 'pfadValue', 'stWithheld', 'fed',
  'withholdingTax', 'discount'
] as const

function ItemSNoAutocomplete({
  value,
  onChange
}: {
  value: string
  onChange: (val: string) => void
}) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  const matches = query
    ? ITEM_SR_NOS.filter(v => v.toLowerCase().includes(query.toLowerCase())).slice(0, 30)
    : ITEM_SR_NOS.slice(0, 30)

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search Item S. No. (e.g. 1(i)(a))"
        className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-surface border border-border rounded shadow-lg">
          {matches.map(m => (
            <div key={m} onClick={() => { onChange(m); setQuery(m); setOpen(false) }}
              className="px-3 py-1 text-sm text-body hover:bg-border-light hover:text-heading cursor-pointer">
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DEFAULT_ITEM = {
  // Col H: supplier's own internal document/file number for this line
  documentNumber: '',
  // ===== Col Y: Invoice Reference No. =====
  // The FBR-assigned invoice number of the original invoice being amended.
  // Required on every line of a Credit Note or Debit Note so FBR can
  // match each corrected line back to the specific original invoice.
  // For a normal Sale Invoice or STWH this is left blank.
  // When arriving via the amendment flow (originalFbrNo URL param), the
  // prefill mapper auto-fills this from that param so the user doesn't
  // have to type it manually — but they can still override it per line
  // if different lines reference different original invoices.
  invoiceRefNo: '',
  hsCode: '',
  hsCodeDescription: '',
  productCode: '',
  description: '',
  quantity: 0,
  uom: 'KG',
  rate: 0,
  taxRate: '18%',
  totalAmount: 0,
  salesTax: 0,
  fixedNotifiedValue: 0,
  extraTax: 0,
  furtherTax: 0,
  pfadValue: 0,
  stWithheld: 0,
  sroSchedule: SRO_SCHEDULES[0],
  itemSNo: ITEM_SR_NOS[0],
  reason: REASONS[0],
  reasonRemarks: '',
  petroleumLevyOn: PETROLEUM_LEVY_OPTIONS[0],
  fed: 0,
  withholdingTax: 0,
  discount: 0
}


type FormError = {
  message: string
  scrollTarget: 'errorBox' | 'sellerRegNo' | 'buyerNtn' | 'buyerCnic' | { item: number }
}

function validateForm(formData: any, amendmentType: string | null): FormError | null {
  if (formData.items.length === 0) {
    return { message: 'Add at least one item to the invoice', scrollTarget: 'errorBox' }
  }

  if (!formData.sellerRegNo.trim()) {
    return { message: 'Seller Registration No. is required', scrollTarget: 'sellerRegNo' }
  }

  if (formData.buyerType === 'Registered' && !formData.buyerNtn.trim()) {
    return { message: 'Buyer NTN is required for Registered buyers', scrollTarget: 'buyerNtn' }
  }
  if (formData.buyerType !== 'Registered' && !formData.buyerCnic.trim()) {
    return { message: 'Buyer CNIC is required', scrollTarget: 'buyerCnic' }
  }

  const missingDocNum = formData.items.findIndex((i: any) => !i.documentNumber.trim())
  if (missingDocNum !== -1) {
    return { message: `Item ${missingDocNum + 1}: Document Number is required`, scrollTarget: { item: missingDocNum } }
  }

  const isAmendment = formData.documentType === 'Credit Note' || formData.documentType === 'Debit Note'
  if (isAmendment) {
    const missingRef = formData.items.findIndex((i: any) => !i.invoiceRefNo.trim())
    if (missingRef !== -1) {
      return {
        message: `Item ${missingRef + 1}: Invoice Reference No. is required for ${formData.documentType} (FBR col Y)`,
        scrollTarget: { item: missingRef }
      }
    }
  }

  if (amendmentType && !(formData as any).amendmentReason?.trim()) {
    return { message: 'Please provide a reason for this amendment', scrollTarget: 'errorBox' }
  }

  return null
}

function CreateInvoicePageContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notWhitelisted, setNotWhitelisted] = useState(false)
  const saveAsDraftRef = useRef(false)
  const errorBoxRef = useRef<HTMLDivElement>(null)
  const sellerRegNoRef = useRef<HTMLInputElement>(null)
const buyerNtnRef = useRef<HTMLInputElement>(null)
const buyerCnicRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

 const [formData, setFormData] = useState({
  sellerRegNo: '',
  taxPeriod: new Date().toISOString().slice(0, 7),
  invoiceType: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  originationProvince: '',
  destinationProvince: '',
  buyerId: '' as string | null,
  buyerNtn: '',
  buyerCnic: '',
  buyerName: '',
  buyerType: '',
  documentType: '',
  saleType: '',
  branchId: '',
  items: [{ ...DEFAULT_ITEM }]
})



  const searchParams = useSearchParams()
  const amendmentType = searchParams.get('amendmentType')
  const originalFbrNo = searchParams.get('originalFbrNo')
  const originalInvoiceId = searchParams.get('originalInvoiceId')
  const editInvoiceId = searchParams.get('edit')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!userData || !token) { router.push('/login'); return }
    setUser(JSON.parse(userData))
    fetchBusinessProfile(token)
    if (editInvoiceId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${editInvoiceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const inv = data.data
            setFormData(prev => ({
              ...prev,
              ...inv,
              items: inv.items.map((item: any) => ({
                ...DEFAULT_ITEM,
                ...item,
                quantity:           Number(item.quantity           || 0),
                rate:               Number(item.rate               || 0),
                totalAmount:        Number(item.totalAmount        || 0),
                salesTax:           Number(item.salesTax           || 0),
                fed:                Number(item.fed                || 0),
                discount:           Number(item.discount           || 0),
                fixedNotifiedValue: Number(item.fixedNotifiedValue || 0),
                extraTax:           Number(item.extraTax           || 0),
                furtherTax:         Number(item.furtherTax         || 0),
                pfadValue:          Number(item.pfadValue          || 0),
                stWithheld:         Number(item.stWithheld         || 0),
              }))
            }))
          } else {
            setError('Could not load invoice for editing')
          }
        })
        .catch(() => setError('Failed to load invoice'))
      return // skip prefill logic entirely when editing
    }

    const prefill = searchParams.get('prefill')
    if (prefill) {
      try {
        const parsed = JSON.parse(prefill)
        if (parsed.items) {
          parsed.items = parsed.items.map((item: any) => ({
            ...DEFAULT_ITEM,
            ...item,
             quantity:           Number(item.quantity           || 0),
              rate:               Number(item.rate               || 0),
              totalAmount:        Number(item.totalAmount        || 0),
              salesTax:           Number(item.salesTax           || 0),
              fed:                Number(item.fed                || 0),
              discount:           Number(item.discount           || 0),
              fixedNotifiedValue: Number(item.fixedNotifiedValue || 0),
              extraTax:           Number(item.extraTax           || 0),
              furtherTax:         Number(item.furtherTax         || 0),
              pfadValue:          Number(item.pfadValue          || 0),
              stWithheld:         Number(item.stWithheld         || 0),
            sroSchedule:        item.sroSchedule     || SRO_SCHEDULES[0],
            itemSNo:            item.itemSNo         || ITEM_SR_NOS[0],
            reason:             item.reason          || REASONS[0],
            reasonRemarks:      item.reasonRemarks   || '',
            petroleumLevyOn:    item.petroleumLevyOn || PETROLEUM_LEVY_OPTIONS[0],
            documentNumber:     item.documentNumber  || '',
            // ===== Col Y: auto-fill invoiceRefNo from the originalFbrNo URL
            // param when prefilling an amendment. The user already saw
            // originalFbrNo in the banner above, so this just carries
            // it down to the per-line field where FBR actually needs it.
            // They can still edit it per-line if needed. =====
            invoiceRefNo:       item.invoiceRefNo || originalFbrNo || '',
          }))
        }
        setFormData(prev => ({ ...prev, ...parsed }))
      } catch (e) { console.log('Failed to parse prefill data') }
    }
  }, [searchParams])

  const fetchBusinessProfile = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/business/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && data.data) {
        setBusiness(data.data)
        if (!data.data.isWhitelisted) {
          setNotWhitelisted(true)
        }
        setFormData(prev => ({
  ...prev,
  sellerRegNo: data.data.ntn || data.data.registrationNo || prev.sellerRegNo
}))
      } else {
        setError('Please setup your business profile first')
      }
    } catch (err) {
      setError('Failed to load business profile')
    }
  }

  const handleInputChange = (e: any) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
  setFormData(prev => ({ ...prev, [name]: value }))
}

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    if (field === 'quantity' || field === 'rate' || field === 'taxRate') {
      const qty  = parseFloat(newItems[index].quantity as any) || 0
      const rate = parseFloat(newItems[index].rate    as any) || 0
      newItems[index].totalAmount = qty * rate
      const pct = rateToPercent(newItems[index].taxRate)
      newItems[index].salesTax = pct !== null ? newItems[index].totalAmount * pct : 0
    }
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  const handleHsCodeSelect = (index: number, code: string, description: string) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], hsCode: code, hsCodeDescription: `${code}:-${description}` }
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  const handleBuyerSelect = (buyer: {
    id: string
    buyerName: string
    buyerNtn: string | null
    buyerCnic: string | null
    buyerType: string | null
    address: string | null
  } | null) => {
    if (!buyer) {
      // user is typing a fresh name — clear the linked buyerId so it saves as new
      setFormData(prev => ({ ...prev, buyerId: null }))
      return
    }
    setFormData(prev => ({
      ...prev,
      buyerId: buyer.id,
      buyerName: buyer.buyerName,
      buyerNtn: buyer.buyerNtn || '',
      buyerCnic: buyer.buyerCnic || '',
      buyerType: buyer.buyerType || 'Unregistered'
    }))
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        ...DEFAULT_ITEM,
        // ===== Col Y: when adding a new line during an amendment, pre-fill
        // invoiceRefNo from the URL param so the user doesn't have to type it =====
        invoiceRefNo: originalFbrNo || ''
      }]
    }))
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  const calculateTotals = () => {
    const totalAmount     = formData.items.reduce((s, i) => s + toNum(i.totalAmount), 0)
    const totalSalesTax   = formData.items.reduce((s, i) => s + toNum(i.salesTax), 0)
    const totalFed        = formData.items.reduce((s, i) => s + toNum(i.fed), 0)
    const totalDiscount   = formData.items.reduce((s, i) => s + toNum(i.discount), 0)
    const totalExtraTax   = formData.items.reduce((s, i) => s + toNum(i.extraTax), 0)
    const totalFurtherTax = formData.items.reduce((s, i) => s + toNum(i.furtherTax), 0)
    const totalPfad       = formData.items.reduce((s, i) => s + toNum(i.pfadValue), 0)
    const totalStWithheld = formData.items.reduce((s, i) => s + toNum(i.stWithheld), 0)
    return { totalAmount, totalSalesTax, totalFed, totalDiscount, totalExtraTax, totalFurtherTax, totalPfad, totalStWithheld }
  }

  function excelDateToInputValue(value: any): string {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    const mm = String(parsed.m).padStart(2, '0')
    const dd = String(parsed.d).padStart(2, '0')
    return `${parsed.y}-${mm}-${dd}`
  }
  const d = new Date(value)
  return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : ''
}

const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  setError('')
  setSuccess('')

  try {
    const buf = await file.arrayBuffer()
    const workbook = XLSX.read(buf, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      setError('That sheet has no data rows')
      return
    }

    const first = rows[0]

    const items = rows.map((row) => {
      const quantity = Number(row['Quantity'] || 0)
      const rate = Number(row['Rate'] || 0)
      const taxRate = String(row['TaxRate'] || '18%')
      const totalAmount = quantity * rate
      const pct = rateToPercent(taxRate)

      return {
        ...DEFAULT_ITEM,
        documentNumber: String(row['DocumentNumber'] || ''),
        invoiceRefNo: String(row['InvoiceRefNo'] || originalFbrNo || ''),
        hsCode: String(row['HSCode'] || ''),
        hsCodeDescription: String(row['HSCodeDescription'] || ''),
        description: String(row['ProductDescription'] || ''),
        quantity,
        uom: String(row['UoM'] || 'KG'),
        rate,
        taxRate,
        totalAmount,
        salesTax: pct !== null ? totalAmount * pct : 0,
        fixedNotifiedValue: Number(row['FixedNotifiedValue'] || 0),
        extraTax: Number(row['ExtraTax'] || 0),
        furtherTax: Number(row['FurtherTax'] || 0),
        pfadValue: Number(row['PfadValue'] || 0),
        stWithheld: Number(row['StWithheld'] || 0),
        fed: Number(row['Fed'] || 0),
        withholdingTax: Number(row['WithholdingTax'] || 0),
        discount: Number(row['Discount'] || 0),
        sroSchedule: String(row['SROSchedule'] || SRO_SCHEDULES[0]),
        itemSNo: String(row['ItemSNo'] || ITEM_SR_NOS[0]),
        reason: String(row['Reason'] || REASONS[0]),
        reasonRemarks: String(row['ReasonRemarks'] || ''),
      }
    })

    setFormData(prev => ({
      ...prev,
      sellerRegNo: String(first['SellerRegNo'] || prev.sellerRegNo),
      invoiceDate: first['InvoiceDate'] ? excelDateToInputValue(first['InvoiceDate']) : prev.invoiceDate,
      documentType: String(first['DocumentType'] || prev.documentType),
      saleType: String(first['SaleType'] || prev.saleType),
      originationProvince: String(first['OriginationProvince'] || prev.originationProvince),
      destinationProvince: String(first['DestinationProvince'] || prev.destinationProvince),
      buyerName: String(first['BuyerName'] || prev.buyerName),
      buyerNtn: String(first['BuyerNTN'] || prev.buyerNtn),
      buyerCnic: String(first['BuyerCNIC'] || prev.buyerCnic),
      buyerType: String(first['BuyerType'] || prev.buyerType),
      buyerId: null, // uploaded name isn't linked to a saved Buyer record
      items,
    }))

    setSuccess(`Loaded ${items.length} item(s) from ${file.name}`)
  } catch (err) {
    console.error(err)
    setError('Could not read that file — make sure it matches the template format')
  } finally {
    e.target.value = '' // lets the same filename be re-uploaded later
  }
}

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

   const formError = validateForm(formData, amendmentType)
    if (formError) {
      setError(formError.message)
      setLoading(false)
      setTimeout(() => {
        if (formError.scrollTarget === 'errorBox') errorBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        else if (formError.scrollTarget === 'sellerRegNo') { sellerRegNoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); sellerRegNoRef.current?.focus() }
        else if (formError.scrollTarget === 'buyerNtn') { buyerNtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); buyerNtnRef.current?.focus() }
        else if (formError.scrollTarget === 'buyerCnic') { buyerCnicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); buyerCnicRef.current?.focus() }
        else itemRefs.current[formError.scrollTarget.item]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = editInvoiceId
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${editInvoiceId}`
  : `${process.env.NEXT_PUBLIC_API_URL}/api/invoices`
const method = editInvoiceId ? 'PUT' : 'POST'

// Ensure every numeric item field is a real number (not '' or a string)
// before this ever reaches the backend — protects against '' being
// saved instead of 0 for tax/value fields that FBR expects as numbers.
const normalizedItems = formData.items.map(item => {
  const normalized = { ...item } as any
  NUMERIC_ITEM_FIELDS.forEach(field => {
    normalized[field] = toNum(normalized[field])
  })
  return normalized
})

const res = await fetch(url, {
  method,
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    ...formData,
    items: normalizedItems,
    buyerId: formData.buyerId || undefined,
    originalInvoiceId: originalInvoiceId || undefined,
    amendmentReason: (formData as any).amendmentReason || undefined,
    status: saveAsDraftRef.current ? 'DRAFT' : undefined
  })
})
    
      const data = await res.json()
      if (data.success) {
        setSuccess(
  saveAsDraftRef.current
    ? 'Invoice saved as draft'
    : editInvoiceId
      ? 'Invoice updated successfully'
      : 'Invoice created and sent to FBR'
)
setTimeout(() => {
  router.push(editInvoiceId ? `/invoices/${editInvoiceId}` : '/invoices')
}, 2000)
      } else {
        setError(data.message || 'Failed to create invoice')
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()
  const isAmendment = formData.documentType === 'Credit Note' || formData.documentType === 'Debit Note'

  return (
    <div className="min-h-screen bg-background text-heading p-8">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <button onClick={() => router.back()} className="text-muted hover:text-heading text-sm mb-2 flex items-center gap-1 transition">
            ← Back
          </button>
          <h1 className="text-3xl font-bold mb-2">
  {amendmentType === 'CREDIT_NOTE' && 'Raise Credit Note'}
  {amendmentType === 'DEBIT_NOTE'  && 'Raise Debit Note'}
  {editInvoiceId && !amendmentType && 'Edit Invoice'}
  {!amendmentType && !editInvoiceId && 'Create Invoice'}
</h1>
          <p className="text-muted">
            {amendmentType ? `Amendment for FBR Invoice: ${originalFbrNo}` : 'Create invoices for your business'}
          </p>
        </div>

<div className="mb-6">
  <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleExcelUpload} className="hidden" />
  <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    className="w-full group bg-surface border border-border rounded-xl px-6 py-5 shadow-sm transition-colors flex items-center gap-4 text-left"
  >
    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-border-light group-hover:bg-heading/5 flex items-center justify-center transition-colors">
      <svg className="w-5 h-5 text-muted group-hover:text-heading transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-heading font-semibold text-sm">Upload Excel to fill the form</p>
      <p className="text-muted text-xs mt-0.5">Drop in a filled template and every field below fills in automatically</p>
    </div>
    <span className="flex-shrink-0 text-xs font-medium text-muted group-hover:text-heading transition-colors border border-border group-hover:border-heading rounded-lg px-3 py-1.5">
      Browse
    </span>
  </button>
</div>

        {amendmentType && (
          <div className="bg-surface border border-border border-l-4 border-l-warning-border rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-warning-text" />
              <p className="text-heading font-semibold text-sm">
                {amendmentType === 'CREDIT_NOTE' ? 'Credit Note' : 'Debit Note'} — Amendment
              </p>
            </div>
            <p className="text-body text-sm mt-2">
              References original FBR Invoice <span className="font-mono text-heading">{originalFbrNo}</span>.
            </p>
            <p className="text-body text-sm mt-2">
              The form is pre-filled with the original invoice.
              {amendmentType === 'CREDIT_NOTE'
                ? ' Reduce the quantities or rates to correct the overcharge.'
                : ' Increase the quantities or rates to correct the undercharge.'}
            </p>
          </div>
        )}

        {success && (
          <div className="bg-surface border border-border border-l-4 border-l-success-border rounded-xl px-4 py-3 mb-6 shadow-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success-text" />
            <p className="text-heading text-sm font-medium">{success}</p>
          </div>
        )}
      {error && (
  <div ref={errorBoxRef} className="bg-red-50 border-2 border-red-500 rounded-xl px-4 py-3 mb-6 shadow-sm flex items-center gap-2">
    <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
    <p className="text-red-700 text-sm font-semibold">{error}</p>
  </div>
)}

        {!business ? (
          <div className="bg-surface border border-border border-l-4 border-l-warning-border rounded-xl px-4 py-3 shadow-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-warning-text" />
            <p className="text-heading text-sm font-medium">Please setup your business profile before creating invoices</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {notWhitelisted && (
              <div className="bg-surface border border-border border-l-4 border-l-warning-border rounded-xl px-4 py-3 shadow-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-text flex-shrink-0" />
                <p className="text-heading text-sm font-medium">Your business is not whitelisted with FBR yet. Contact the FBR helpline.</p>
              </div>
            )}

            {/* Seller & Filing Info */}
            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Seller &amp; Filing Info</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-2">Seller Registration No. (NTN) *</label>
                <input ref={sellerRegNoRef} type="text" name="sellerRegNo" value={formData.sellerRegNo} onChange={handleInputChange}
  placeholder="Registration No. or NTN with Check Digit" required
  className="w-full bg-surface border border-border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent" />
                  <p className="text-xs text-muted mt-1">Provide Registration No. or NTN with Check Digit, per FBR requirement</p>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Tax Period *</label>
                  <input type="month" name="taxPeriod" value={formData.taxPeriod} onChange={handleInputChange} required
                    className="w-full bg-surface border border-border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent" />
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-2">Invoice Type *</label>
                 <StyledSelect
  options={[
    { value: 'SALE', label: 'Sale' },
    { value: 'PURCHASE', label: 'Purchase' },
    { value: 'DEBIT_NOTE', label: 'Debit Note' },
    { value: 'CREDIT_NOTE', label: 'Credit Note' },
  ]}
  value={formData.invoiceType ? { value: formData.invoiceType, label: formData.invoiceType } : null}
  onChange={opt => handleSelectChange('invoiceType', opt?.value || '')}
  placeholder="Select invoice type"
/>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Document Type *</label>
                        <StyledSelect
          options={toOptions(DOCUMENT_TYPES)}
          value={{ value: formData.documentType, label: formData.documentType }}
          onChange={opt => handleSelectChange('documentType', opt?.value || '')}
          placeholder="Select document type"
        />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Invoice Date *</label>
                  <input type="date" name="invoiceDate" value={formData.invoiceDate} onChange={handleInputChange} required
                    className="w-full bg-surface border border-border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Sale Type</label>
                  <StyledSelect
  options={toOptions(SALE_TYPES)}
  value={{ value: formData.saleType, label: formData.saleType }}
  onChange={opt => handleSelectChange('saleType', opt?.value || '')}
  placeholder="Select sale type"
/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-muted mb-2">Sale Origination Province of Supplier *</label>
                 <StyledSelect
  options={toOptions(PROVINCES)}
  value={{ value: formData.originationProvince, label: formData.originationProvince }}
  onChange={opt => handleSelectChange('originationProvince', opt?.value || '')}
  placeholder="Select origination province"
/>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Destination of Supply *</label>
                  <StyledSelect
  options={toOptions(PROVINCES)}
  value={{ value: formData.destinationProvince, label: formData.destinationProvince }}
  onChange={opt => handleSelectChange('destinationProvince', opt?.value || '')}
  placeholder="Select destination province"
/>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-muted mb-2">Buyer Name</label>
                  <ClientAutocomplete
                    value={formData.buyerName}
                    onSelect={handleBuyerSelect}
                    onTextChange={(text) => setFormData(prev => ({ ...prev, buyerName: text }))}
                  />
                </div>
                <div>
                 <label className="block text-sm text-muted mb-2">
  Buyer NTN {formData.buyerType === 'Registered' && '*'}
</label>
                  <input ref={buyerNtnRef} type="text" name="buyerNtn" value={formData.buyerNtn} onChange={handleInputChange}
                    placeholder="7 digit NTN"
                    required={formData.buyerType === 'Registered'}
                    className="w-full bg-surface border border-border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent" />
                </div>
                <div>
                 <label className="block text-sm text-muted mb-2">
  Buyer CNIC {formData.buyerType !== 'Registered' && '*'}
</label>
                  <input ref={buyerCnicRef} type="text" name="buyerCnic" value={formData.buyerCnic} onChange={handleInputChange}
                    placeholder="13 digit CNIC"
                    required={formData.buyerType !== 'Registered'}
                    className="w-full bg-surface border border-border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Buyer Type *</label>
                 <StyledSelect
  options={toOptions(BUYER_TYPES)}
  value={{ value: formData.buyerType, label: formData.buyerType }}
  onChange={opt => handleSelectChange('buyerType', opt?.value || '')}
   placeholder="Select buyer type"
/>
                </div>
              </div>

              {amendmentType && (
                <div className="mt-4">
                  <label className="block text-sm text-muted mb-2">
                    Reason for Amendment *
                  </label>
                  <textarea name="amendmentReason" value={(formData as any).amendmentReason || ''} onChange={handleInputChange}
                    placeholder={amendmentType === 'CREDIT_NOTE'
                      ? 'e.g. Wrong quantity billed, customer returned 20 units'
                      : 'e.g. Additional items delivered, pricing error corrected'}
                    rows={3} required
                    className="w-full bg-surface border border-border text-heading rounded-lg px-4 py-2 focus:outline-none focus:border-accent transition resize-none" />
                  <p className="text-xs text-muted mt-1">This reason will appear on the amendment document and is required for FBR compliance</p>
                </div>
              )}
            </div>

            {/* Invoice Items */}
            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Invoice Items</h2>
                <button type="button" onClick={addItem}
                  className="bg-btn-dark hover:bg-btn-dark-hover text-btn-dark-text px-4 py-2 rounded-lg text-sm font-semibold transition">
                   Add Item
                </button>
              </div>

              <div className="space-y-4">
              {formData.items.map((item, index) => (
  <div key={index} ref={el => { itemRefs.current[index] = el }} className="bg-surface rounded-xl p-4 border border-border shadow-sm">

                    {/* Document Number (col H) + Invoice Reference No. (col Y) — top of card */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-muted mb-1">
  Document Number *
  <span className="ml-1 text-muted font-normal"></span>
</label>
                        <input type="text" value={item.documentNumber}
                          onChange={e => handleItemChange(index, 'documentNumber', e.target.value)}
                          placeholder="e.g. INV-2025-001 or File-02"
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                        <p className="text-xs text-muted mt-1">Your internal invoice / file number for this line. Required.</p>
                      </div>

                      {/* ===== Col Y: Invoice Reference No. =====
                          Only shown for Credit Note / Debit Note since FBR only
                          expects it on amendment documents. Hidden for Sale Invoice
                          and STWH to avoid confusing users with an irrelevant field.
                          Auto-filled from originalFbrNo URL param on amendment flow. =====
                      */}
                      {isAmendment && (
                        <div>
                          <label className="block text-xs text-muted mb-1">
  Invoice Reference No. *
  <span className="ml-1 text-muted font-normal">(FBR col Y)</span>
</label>
                          <input type="text" value={item.invoiceRefNo}
                            onChange={e => handleItemChange(index, 'invoiceRefNo', e.target.value)}
                            placeholder="FBR invoice no. of the original invoice"
                            className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                          <p className="text-xs text-muted mt-1">FBR-assigned number of the original invoice this line corrects.</p>
                        </div>
                      )}
                    </div>

                    {/* Row 1a: HS Code — full width, own row */}
                    <div className="mb-3">
                      <label className="block text-xs text-muted mb-1">
                        HS Code Description
                        {item.hsCode && <span className="ml-2 text-link font-mono">{item.hsCode}</span>}
                      </label>
                      <HsCodeAutocomplete value={item.hsCodeDescription}
                        onSelect={(code, desc, fullEntry) => handleHsCodeSelect(index, code, fullEntry)} />
                    </div>

                    {/* Row 1b: Product Description, Qty, Unit Price, Total */}
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-muted mb-1">Product Description</label>
                        <input type="text" value={item.description}
                          onChange={e => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Product name"
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">Qty</label>
                        <input type="number" value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                          placeholder=""
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">Unit Price</label>
                        <input type="number" value={item.rate}
                          onChange={e => handleItemChange(index, 'rate', e.target.value)}
                          placeholder=""
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">Total</label>
                        <input type="text" value={Number(item.totalAmount || 0).toFixed(2)} disabled
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                      </div>
                    </div>

                    {/* Row 2: UoM, Tax Rate */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs text-muted mb-1">UoM</label>
                       <StyledSelect
  options={toOptions(UOMS)}
  value={{ value: item.uom, label: item.uom }}
  onChange={opt => handleItemChange(index, 'uom', opt?.value || '')}
/>
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1">Rate (Tax %) — fixed-charge rates won&apos;t auto-calc sales tax</label>
                       <StyledSelect
  options={toOptions(RATES)}
  value={{ value: item.taxRate, label: item.taxRate }}
  onChange={opt => handleItemChange(index, 'taxRate', opt?.value || '')}
/>
                      </div>
                    </div>

                    {/* Petroleum Levy on — Petroleum Products only */}
                    {formData.saleType === 'Petroleum Products' && (
                      <div className="mt-3">
                        <label className="block text-xs text-muted mb-1">Petroleum Levy on</label>
                       <StyledSelect
  options={toOptions(PETROLEUM_LEVY_OPTIONS)}
  value={{ value: item.petroleumLevyOn, label: item.petroleumLevyOn }}
  onChange={opt => handleItemChange(index, 'petroleumLevyOn', opt?.value || '')}
/>
                        <p className="text-xs text-muted mt-1">Whether the levy applies to a direct sale or retail sale</p>
                      </div>
                    )}

                 {/* Points 10–14: Fixed/Notified Value, Extra Tax, Further Tax, PFAD, ST Withheld */}
                    <div className="grid grid-cols-5 gap-3 mt-3">
                      <div>
                        <label className="block text-xs text-muted mb-1 min-h-[2.5rem]">Fixed / Notified Value or Retail Price (PKR)</label>
                        <input type="number" value={item.fixedNotifiedValue}
                          onChange={e => handleItemChange(index, 'fixedNotifiedValue', e.target.value)}
                          placeholder="0 if not applicable"
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                        <p className="text-xs text-muted mt-1">Leave 0 if no govt-notified price applies</p>
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1 min-h-[2.5rem]">Extra Tax (PKR)</label>
                        <input type="number" value={item.extraTax}
                          onChange={e => handleItemChange(index, 'extraTax', e.target.value)}
                          placeholder="0 if not applicable"
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                        <p className="text-xs text-muted mt-1">Applies to SIMs, mobile phones, petroleum etc.</p>
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1 min-h-[2.5rem]">Further Tax (PKR)</label>
                        <input type="number" value={item.furtherTax}
                          onChange={e => handleItemChange(index, 'furtherTax', e.target.value)}
                          placeholder="0 if not applicable"
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                        <p className="text-xs text-muted mt-1">3% surcharge for sales to unregistered buyers</p>
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1 min-h-[2.5rem]">Total Value of Sales — PFAD only (PKR)</label>
                        <input type="number" value={item.pfadValue}
                          onChange={e => handleItemChange(index, 'pfadValue', e.target.value)}
                          placeholder="0 if not applicable"
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                        <p className="text-xs text-muted mt-1">Only for Palm Fatty Acid Distillate supplies</p>
                      </div>
                      <div>
                        <label className="block text-xs text-muted mb-1 min-h-[2.5rem]">ST Withheld at Source (PKR)</label>
                        <input type="number" value={item.stWithheld}
                         onChange={e => handleItemChange(index, 'stWithheld', e.target.value)}
                          placeholder="0 if not applicable"
                          className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                        <p className="text-xs text-muted mt-1">Sales tax withheld by buyer at source</p>
                      </div>
                    </div>

                    {/* Exemption / Zero & Reduced Rate Reference */}
                    <div className="mt-3">
                      <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-2">
                        Exemption / Zero &amp; Reduced Rate Reference
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted mb-1">SRO No. / Schedule No.</label>
                         <StyledSelect
  options={toOptions(SRO_SCHEDULES)}
  value={{ value: item.sroSchedule, label: item.sroSchedule }}
  onChange={opt => handleItemChange(index, 'sroSchedule', opt?.value || '')}
/>
                          <p className="text-xs text-muted mt-1">Required for exempt/zero-rated/reduced-rate items</p>
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Item S. No.</label>
                          <ItemSNoAutocomplete value={item.itemSNo} onChange={val => handleItemChange(index, 'itemSNo', val)} />
                          <p className="text-xs text-muted mt-1">Clause number within the selected SRO/Schedule</p>
                        </div>
                      </div>
                    </div>

                    {/* Reason / Reason Remarks — Credit Note / Debit Note only */}
                    {isAmendment && (
                      <div className="mt-3">
                        <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-2">Reason for Amendment</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-muted mb-1">Reason</label>
                           <StyledSelect
  options={toOptions(REASONS)}
  value={{ value: item.reason, label: item.reason }}
  onChange={opt => handleItemChange(index, 'reason', opt?.value || '')}
/>
                            <p className="text-xs text-muted mt-1">FBR-approved reason code for this line&apos;s adjustment</p>
                          </div>
                          <div>
                            <label className="block text-xs text-muted mb-1">Reason Remarks</label>
                            <input type="text" value={item.reasonRemarks}
                              onChange={e => handleItemChange(index, 'reasonRemarks', e.target.value)}
                              placeholder="e.g. 20 units returned due to damage"
                              className="w-full bg-surface border border-border text-heading rounded px-3 py-1 text-sm focus:outline-none focus:border-accent" />
                            <p className="text-xs text-muted mt-1">Free-text detail supporting the reason above</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)}
                        className="mt-2 text-error-text hover:opacity-70 text-sm">
                        Remove Item
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
              <div className="grid grid-cols-8 gap-4 text-center">
                <div><p className="text-muted text-sm">Total Amount</p><p className="text-xl font-bold text-heading">PKR {totals.totalAmount.toFixed(2)}</p></div>
                <div><p className="text-muted text-sm">Sales Tax</p><p className="text-xl font-bold text-heading">PKR {totals.totalSalesTax.toFixed(2)}</p></div>
                <div><p className="text-muted text-sm">Extra Tax</p><p className="text-xl font-bold text-heading">PKR {totals.totalExtraTax.toFixed(2)}</p></div>
                <div><p className="text-muted text-sm">Further Tax</p><p className="text-xl font-bold text-heading">PKR {totals.totalFurtherTax.toFixed(2)}</p></div>
                <div><p className="text-muted text-sm">FED</p><p className="text-xl font-bold text-heading">PKR {totals.totalFed.toFixed(2)}</p></div>
                <div><p className="text-muted text-sm">PFAD Value</p><p className="text-xl font-bold text-heading">PKR {totals.totalPfad.toFixed(2)}</p></div>
                <div><p className="text-muted text-sm">ST Withheld</p><p className="text-xl font-bold text-heading">PKR {totals.totalStWithheld.toFixed(2)}</p></div>
                <div>
                  <p className="text-muted text-sm">Grand Total</p>
                  <p className="text-xl font-bold bg-heading text-surface rounded px-2 py-0.5 inline-block">
                    PKR {(totals.totalAmount + totals.totalSalesTax + totals.totalExtraTax + totals.totalFurtherTax + totals.totalFed - totals.totalDiscount).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 justify-start">
              <button type="submit" disabled={loading || !business}
                onClick={() => { saveAsDraftRef.current = false }}
                className="bg-btn-dark hover:bg-btn-dark-hover disabled:bg-border-light disabled:text-muted text-btn-dark-text font-semibold py-3 px-8 rounded-lg transition">
                {loading ? (editInvoiceId ? 'Saving Changes...' : 'Creating Invoice...') : (editInvoiceId ? 'Save Changes' : 'Create Invoice')}
              </button>
              <button type="submit" disabled={loading || !business}
                onClick={() => { saveAsDraftRef.current = true }}
                className="bg-surface border border-border hover:border-heading text-heading font-semibold py-3 px-8 rounded-lg transition">
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button type="button" onClick={() => router.push('/invoices')}
                className="bg-surface border border-border hover:border-heading text-heading font-semibold py-3 px-8 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-heading flex items-center justify-center">
        Loading...
      </div>
    }>
      <CreateInvoicePageContent />
    </Suspense>
  )
}