import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-accent mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          <div>
            <p className="text-heading font-semibold text-lg mb-2">E-Invoice</p>
            <p className="text-heading/70 text-sm">
              FBR-compliant invoicing, built for how Pakistani businesses actually work.
            </p>
          </div>

          <div>
            <p className="text-heading font-semibold text-sm mb-3">Quick Links</p>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" className="text-heading/70 hover:text-heading text-sm transition">Dashboard</Link>
              <Link href="/create" className="text-heading/70 hover:text-heading text-sm transition">Create Invoice</Link>
              <Link href="/invoices" className="text-heading/70 hover:text-heading text-sm transition">Invoices</Link>
            </div>
          </div>

          <div>
            <p className="text-heading font-semibold text-sm mb-3">Templates</p>
            <div className="flex flex-col gap-2">
              <a href="/templates/invoice_upload_template.xlsx" download className="text-heading/70 hover:text-heading text-sm transition">
                Excel Template
              </a>
            </div>
          </div>

          <div>
            <p className="text-heading font-semibold text-sm mb-3">Support</p>
            <div className="flex flex-col gap-2">
              <Link href="/settings" className="text-heading/70 hover:text-heading text-sm transition">Settings</Link>
              <a href="mailto:support@e-invoice.pk" className="text-heading/70 hover:text-heading text-sm transition">
                support@e-invoice.pk
              </a>
            </div>
          </div>

        </div>

        <div className="border-t border-heading/15 mt-8 pt-6 flex justify-center">
          <p className="text-heading/70 text-xs">
            © {new Date().getFullYear()} E-Invoice. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}