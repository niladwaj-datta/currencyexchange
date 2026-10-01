import { NextRequest, NextResponse } from 'next/server'

const currencyNames: Record<string, string> = { USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen', AUD: 'Australian Dollar', CAD: 'Canadian Dollar', CHF: 'Swiss Franc', CNY: 'Chinese Yuan', INR: 'Indian Rupee', SGD: 'Singapore Dollar', NZD: 'New Zealand Dollar', HKD: 'Hong Kong Dollar', SEK: 'Swedish Krona', NOK: 'Norwegian Krone', DKK: 'Danish Krone', PLN: 'Polish Zloty', BRL: 'Brazilian Real', MXN: 'Mexican Peso', ZAR: 'South African Rand', AED: 'UAE Dirham', KRW: 'South Korean Won', THB: 'Thai Baht', TRY: 'Turkish Lira', ILS: 'Israeli New Shekel', PHP: 'Philippine Peso', CZK: 'Czech Koruna', HUF: 'Hungarian Forint', ISK: 'Icelandic Krona', RON: 'Romanian Leu', BGN: 'Bulgarian Lev' }
const allowed = new Set(Object.keys(currencyNames))

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const base = (searchParams.get('base') || 'USD').toUpperCase()
  const symbols = (searchParams.get('symbols') || 'EUR').toUpperCase().split(',').filter(Boolean)
  if (!/^[A-Z]{3}$/.test(base) || !allowed.has(base) || symbols.length !== 1 || !allowed.has(symbols[0])) {
    return NextResponse.json({ error: 'Choose supported ISO currency codes.' }, { status: 400 })
  }
  if (base === symbols[0]) return NextResponse.json({ amount: 1, base, date: new Date().toISOString().slice(0, 10), rates: { [base]: 1 }, names: { [base]: currencyNames[base] }, provider: 'Frankfurter.app / ECB' })
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${symbols[0]}`, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error('Rate provider unavailable')
    const data = await response.json()
    return NextResponse.json({ ...data, names: Object.fromEntries(Object.keys(data.rates || {}).map((code) => [code, currencyNames[code] || code])), provider: 'Frankfurter.app / ECB' }, { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } })
  } catch { return NextResponse.json({ error: 'Live rates are temporarily unavailable. Please try again.' }, { status: 502 }) }
}
