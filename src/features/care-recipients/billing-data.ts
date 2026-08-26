import { TODAY } from '@/lib/today'
import type { Tone } from '@/types'

/* ---------------------------------- types --------------------------------- */

export type InvoiceStatus = 'paid' | 'pending' | 'overdue'

export interface Invoice {
  id: string
  number: string
  /** ISO. When the invoice was raised — drives "billed this month". */
  issuedAt: string
  periodStart: string
  periodEnd: string
  services: string
  visits: number
  /** ISO. Only meaningful while unpaid. */
  dueAt: string
  /** ISO. Present exactly when the invoice is settled. */
  paidAt?: string
}

export interface BillingContact {
  name: string
  relationship: string
  email: string
  phone: string
}

export interface PaymentMethod {
  brand: string
  last4: string
  autoPay: boolean
}

export interface Insurance {
  provider: string
  policyNumber: string
  /** 0–1. Drives every insurance/patient split on the tab. */
  coverageRate: number
  secondary: string | null
}

export interface ServiceLine {
  id: string
  label: string
  amount: number
  tone: Tone
}

export interface BillingRecord {
  contact: BillingContact
  method: PaymentMethod
  insurance: Insurance
  invoices: Invoice[]
  /** Year-to-date spend by service line. */
  services: ServiceLine[]
}

export { TODAY } from '@/lib/today'
export const INVOICES_PAGE_SIZE = 6

/** Flat visit rate. Every invoice amount is `visits × RATE`. */
export const RATE_PER_VISIT = 300

/* ---------------------------------- data ---------------------------------- */

/*
 * Semi-monthly billing periods. The first covers Mar 16–31, the first full
 * half-month after the March 15 care start. No period ends after 2026-07-24,
 * so there is no invoice for work not yet delivered.
 */
const records: Record<string, BillingRecord> = {
  'cr-001': {
    contact: {
      name: 'David Johnson',
      relationship: 'Son / Primary Guarantor',
      email: 'david.johnson@example.com',
      phone: '(555) 123-4567',
    },
    method: { brand: 'VISA', last4: '4521', autoPay: true },
    insurance: {
      provider: 'MedCare Plus',
      policyNumber: 'MC-789456',
      coverageRate: 0.8,
      secondary: null,
    },
    invoices: [
      {
        id: 'inv089',
        number: 'INV-2026-089',
        issuedAt: '2026-07-16',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-15',
        services: 'Morning + Afternoon Care',
        visits: 20,
        dueAt: '2026-08-01',
      },
      {
        id: 'inv088',
        number: 'INV-2026-088',
        issuedAt: '2026-07-01',
        periodStart: '2026-06-16',
        periodEnd: '2026-06-30',
        services: 'Morning + Afternoon Care',
        visits: 16,
        dueAt: '2026-07-16',
        paidAt: '2026-07-15',
      },
      {
        id: 'inv087',
        number: 'INV-2026-087',
        issuedAt: '2026-06-16',
        periodStart: '2026-06-01',
        periodEnd: '2026-06-15',
        services: 'Morning + Afternoon + PT',
        visits: 14,
        dueAt: '2026-07-01',
        paidAt: '2026-07-01',
      },
      {
        id: 'inv086',
        number: 'INV-2026-086',
        issuedAt: '2026-06-01',
        periodStart: '2026-05-16',
        periodEnd: '2026-05-31',
        services: 'Care Services',
        visits: 15,
        dueAt: '2026-06-16',
        paidAt: '2026-06-15',
      },
      {
        id: 'inv085',
        number: 'INV-2026-085',
        issuedAt: '2026-05-16',
        periodStart: '2026-05-01',
        periodEnd: '2026-05-15',
        services: 'Care + Clinical',
        visits: 17,
        dueAt: '2026-06-01',
        paidAt: '2026-06-01',
      },
      {
        id: 'inv084',
        number: 'INV-2026-084',
        issuedAt: '2026-05-01',
        periodStart: '2026-04-16',
        periodEnd: '2026-04-30',
        services: 'Care Services',
        visits: 16,
        dueAt: '2026-05-16',
        paidAt: '2026-05-15',
      },
      {
        id: 'inv083',
        number: 'INV-2026-083',
        issuedAt: '2026-04-16',
        periodStart: '2026-04-01',
        periodEnd: '2026-04-15',
        services: 'Care Services',
        visits: 15,
        dueAt: '2026-05-01',
        paidAt: '2026-05-01',
      },
      {
        id: 'inv082',
        number: 'INV-2026-082',
        issuedAt: '2026-04-01',
        periodStart: '2026-03-16',
        periodEnd: '2026-03-31',
        services: 'Care Services (partial month)',
        visits: 12,
        dueAt: '2026-04-16',
        paidAt: '2026-04-15',
      },
    ],
    /*
     * Sums to the year-to-date invoice total (125 visits × ₦300 = ₦37,500),
     * and chosen so the computed shares are whole percentages totalling 100 —
     * a donut whose legend adds up to 99% reads as a bug.
     */
    services: [
      { id: 'sv1', label: 'Morning Care', amount: 16875, tone: 'blue' },
      { id: 'sv2', label: 'Afternoon Care', amount: 12750, tone: 'purple' },
      { id: 'sv3', label: 'Physical Therapy', amount: 5250, tone: 'green' },
      { id: 'sv4', label: 'Clinical Checkups', amount: 2625, tone: 'amber' },
    ],
  },
}

export function getBillingRecord(
  recipientId: string,
): BillingRecord | undefined {
  return records[recipientId]
}

/* -------------------------------- formatting ------------------------------- */

const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

export function formatMoney(amount: number): string {
  return money.format(amount)
}

const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const longDate = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(`${iso}T00:00:00Z`))
}

export function formatLongDate(iso: string): string {
  return longDate.format(new Date(`${iso}T00:00:00Z`))
}

/** "Jul 1 – 15" for a same-month period, else "Jun 16 – Jul 15". */
export function formatPeriod(invoice: Invoice): string {
  const start = new Date(`${invoice.periodStart}T00:00:00Z`)
  const end = new Date(`${invoice.periodEnd}T00:00:00Z`)
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear()
  return sameMonth
    ? `${shortDate.format(start)} – ${end.getUTCDate()}`
    : `${shortDate.format(start)} – ${shortDate.format(end)}`
}

/* --------------------------------- derived -------------------------------- */

/**
 * Everything below is computed from the invoice list and the coverage rate.
 * The original design stated a total, an outstanding balance, a last payment
 * and a YTD breakdown that no combination of its own rows could produce.
 */

export function invoiceAmount(invoice: Invoice): number {
  return invoice.visits * RATE_PER_VISIT
}

export function insuranceCovered(invoice: Invoice, rate: number): number {
  return Math.round(invoiceAmount(invoice) * rate)
}

export function patientDue(invoice: Invoice, rate: number): number {
  return invoiceAmount(invoice) - insuranceCovered(invoice, rate)
}

export function invoiceStatus(invoice: Invoice, today = TODAY): InvoiceStatus {
  if (invoice.paidAt) return 'paid'
  return invoice.dueAt < today ? 'overdue' : 'pending'
}

/** Total raised in the same calendar month as `today`. */
export function billedThisMonth(invoices: Invoice[], today = TODAY): number {
  const month = today.slice(0, 7)
  return invoices
    .filter((i) => i.issuedAt.slice(0, 7) === month)
    .reduce((sum, i) => sum + invoiceAmount(i), 0)
}

/** Total raised in the calendar month before `today`. */
export function billedLastMonth(invoices: Invoice[], today = TODAY): number {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - 1)
  const month = d.toISOString().slice(0, 7)
  return invoices
    .filter((i) => i.issuedAt.slice(0, 7) === month)
    .reduce((sum, i) => sum + invoiceAmount(i), 0)
}

/** Month-over-month change, computed rather than asserted. */
export function billedDelta(
  invoices: Invoice[],
  today = TODAY,
): { value: string; direction: 'up' | 'down' } | null {
  const previous = billedLastMonth(invoices, today)
  if (previous === 0) return null
  const current = billedThisMonth(invoices, today)
  const change = ((current - previous) / previous) * 100
  return {
    value: `${Math.abs(change).toFixed(1)}%`,
    direction: change >= 0 ? 'up' : 'down',
  }
}

/** Patient share of everything not yet settled. */
export function outstandingBalance(invoices: Invoice[], rate: number): number {
  return invoices
    .filter((i) => !i.paidAt)
    .reduce((sum, i) => sum + patientDue(i, rate), 0)
}

/** Earliest due date among unpaid invoices. */
export function nextDueDate(invoices: Invoice[]): string | null {
  return invoices
    .filter((i) => !i.paidAt)
    .map((i) => i.dueAt)
    .sort()[0] ?? null
}

export interface Payment {
  id: string
  paidAt: string
  amount: number
  invoiceNumber: string
}

/** One payment per settled invoice, newest first. */
export function payments(invoices: Invoice[], rate: number): Payment[] {
  return invoices
    .filter((i): i is Invoice & { paidAt: string } => Boolean(i.paidAt))
    .map((i) => ({
      id: i.id,
      paidAt: i.paidAt,
      amount: patientDue(i, rate),
      invoiceNumber: i.number,
    }))
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
}

export function servicesTotal(services: ServiceLine[]): number {
  return services.reduce((sum, s) => sum + s.amount, 0)
}

/** Newest issue date first; ties fall back to invoice number. */
export function sortInvoices(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort(
    (a, b) =>
      b.issuedAt.localeCompare(a.issuedAt) || b.number.localeCompare(a.number),
  )
}
