'use client'

import { useMemo, useState } from 'react'
import { ArrowLeftRight, Beaker, ChevronDown, Clock3, Copy, Globe2, History, Info, Layers3, Loader2, Ruler, Scale, Thermometer, Timer, Zap } from 'lucide-react'

const units = {
  Length: { icon: Ruler, units: { Meter: 1, Kilometer: 1000, Centimeter: 0.01, Millimeter: 0.001, Mile: 1609.344, Yard: 0.9144, Foot: 0.3048, Inch: 0.0254 } },
  Weight: { icon: Scale, units: { Kilogram: 1, Gram: 0.001, Milligram: 0.000001, Pound: 0.45359237, Ounce: 0.028349523125, Ton: 1000 } },
  Volume: { icon: Beaker, units: { Liter: 1, Milliliter: 0.001, 'm³': 1000, 'cm³': 0.001, Gallon: 3.785411784, Cup: 0.2365882365 } },
  Temperature: { icon: Thermometer, units: { Celsius: 1, Fahrenheit: 1, Kelvin: 1 } },
  Area: { icon: Layers3, units: { 'Square meter': 1, 'Square kilometer': 1000000, 'Square foot': 0.09290304, 'Square yard': 0.83612736, Acre: 4046.8564224, Hectare: 10000 } },
  Speed: { icon: Zap, units: { 'Meters / second': 1, 'Kilometers / hour': 0.2777777777777778, 'Miles / hour': 0.44704, Knot: 0.5144444444444445 } },
  Time: { icon: Clock3, units: { Second: 1, Minute: 60, Hour: 3600, Day: 86400, Week: 604800 } },
} as const

type Category = keyof typeof units
type HistoryItem = { kind: 'Unit' | 'Currency'; text: string; formula: string }
const currencies = ['USD','EUR','GBP','JPY','AUD','CAD','CHF','CNY','INR','SGD','NZD','HKD','SEK','NOK','DKK','PLN','BRL','MXN','ZAR','AED','KRW','THB','TRY','ILS','PHP','CZK','HUF','ISK','RON','BGN']

function formatValue(value: number) {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  if ((abs !== 0 && abs < 0.0001) || abs >= 1e12) return value.toExponential(4)
  return Number(value.toFixed(4)).toLocaleString('en-US', { maximumFractionDigits: 4 })
}
function convertTemperature(value: number, from: string, to: string) {
  const celsius = from === 'Fahrenheit' ? (value - 32) * 5 / 9 : from === 'Kelvin' ? value - 273.15 : value
  return to === 'Fahrenheit' ? celsius * 9 / 5 + 32 : to === 'Kelvin' ? celsius + 273.15 : celsius
}
function exactFormula(category: Category, value: string, from: string, to: string, output: string) {
  if (category === 'Temperature') return `${value}° ${from} → ${output}° ${to}. Temperature scales use an offset formula.`
  const factor = (units[category].units as Record<string, number>)[from] / (units[category].units as Record<string, number>)[to]
  return `${value} × (${factor}) = ${output} ${to}. Factors convert through the SI base unit.`
}

export default function Home() {
  const [category, setCategory] = useState<Category>('Length')
  const [value, setValue] = useState('1')
  const [from, setFrom] = useState('Meter')
  const [to, setTo] = useState('Kilometer')
  const [result, setResult] = useState('0.001')
  const [formula, setFormula] = useState('1 × (1 / 1000) = 0.001 Kilometer')
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [targetCurrency, setTargetCurrency] = useState('EUR')
  const [currencyValue, setCurrencyValue] = useState('100')
  const [currencyResult, setCurrencyResult] = useState('—')
  const [rate, setRate] = useState<number | null>(null)
  const [rateDate, setRateDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const categoryUnits = useMemo(() => Object.keys(units[category].units), [category])

  function addHistory(item: HistoryItem) { setHistory((items) => [item, ...items].slice(0, 8)) }
  function calculateUnits() {
    const numericValue = Number(value)
    if (!value.trim() || !Number.isFinite(numericValue)) { setError('Enter a valid finite number.'); setResult('—'); return }
    setError('')
    const next = category === 'Temperature' ? convertTemperature(numericValue, from, to) : numericValue * (units[category].units as Record<string, number>)[from] / (units[category].units as Record<string, number>)[to]
    const output = formatValue(next)
    const nextFormula = exactFormula(category, value, from, to, output)
    setResult(output); setFormula(nextFormula); addHistory({ kind: 'Unit', text: `${value} ${from} → ${output} ${to}`, formula: nextFormula })
  }
  function changeCategory(next: Category) {
    const nextUnits = Object.keys(units[next].units)
    setCategory(next); setFrom(nextUnits[0]); setTo(nextUnits[1]); setResult('—'); setFormula('Choose a value and convert to see the exact formula.'); setError('')
  }
  async function calculateCurrency() {
    const numericValue = Number(currencyValue)
    if (!currencyValue.trim() || !Number.isFinite(numericValue)) { setError('Enter a valid currency amount.'); setCurrencyResult('—'); return }
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/rates?base=${baseCurrency}&symbols=${targetCurrency}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to retrieve live rates')
      const nextRate = Number(data.rates?.[targetCurrency])
      if (!Number.isFinite(nextRate)) throw new Error('Rate unavailable for this pair')
      const output = formatValue(numericValue * nextRate)
      setCurrencyResult(output); setRate(nextRate); setRateDate(data.date || '')
      addHistory({ kind: 'Currency', text: `${currencyValue} ${baseCurrency} → ${output} ${targetCurrency}`, formula: `1 ${baseCurrency} = ${formatValue(nextRate)} ${targetCurrency}` })
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to retrieve live rates.'); setCurrencyResult('—'); setRate(null) } finally { setLoading(false) }
  }
  const Icon = units[category].icon
  return <main className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8"><a href="#converter" className="flex items-center gap-3"><div className="brand-mark"><ArrowLeftRight size={20} /></div><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary">precision tools</p><h1 className="font-serif text-xl font-bold tracking-tight">Convertix<span className="text-primary">.</span></h1></div></a><nav className="hidden items-center gap-1 rounded-full bg-muted p-1 sm:flex" aria-label="Main navigation"><a className="tab tab-active" href="#converter">Conversions</a><a className="tab" href="#currency">Currency</a><a className="tab" href="#history">History</a><a className="tab" href="#about">About</a></nav><span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><span className="live-dot" /> Live rates</span></div></header>
    <section className="mx-auto max-w-7xl px-5 pb-8 pt-12 lg:px-8 lg:pt-16"><p className="eyebrow">One place. Every conversion.</p><h2 className="mt-4 max-w-2xl font-serif text-5xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl">Make every number <span className="text-primary">make sense.</span></h2><p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Accurate physical conversions and transparent live currency exchange for everyday decisions.</p></section>
    <section id="converter" className="mx-auto max-w-7xl scroll-mt-24 px-5 lg:px-8"><div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)]"><div className="border-b border-border px-5 py-4 sm:px-7"><p className="section-label">Physical parameters</p><div className="mt-3 flex gap-2 overflow-x-auto">{(Object.keys(units) as Category[]).map((item) => { const ItemIcon = units[item].icon; return <button key={item} onClick={() => changeCategory(item)} className={`category-button min-w-max ${category === item ? 'category-active' : ''}`}><ItemIcon size={16} />{item}</button> })}</div></div><div className="p-5 sm:p-8"><div className="mb-7 flex items-center gap-3"><div className="icon-tile"><Icon size={20} /></div><div><p className="section-label">Selected parameter</p><h3 className="mt-0.5 text-lg font-semibold">{category}</h3></div></div><div className="grid items-end gap-4 xl:grid-cols-[1fr_48px_1fr]"><Field label="From" value={value} onChange={setValue} select={from} options={categoryUnits} onSelect={(v) => { setFrom(v); setResult('—') }} /><button aria-label="Swap units" onClick={() => { setFrom(to); setTo(from); setResult('—') }} className="swap-button"><ArrowLeftRight size={18} /></button><Field label="To" value={result} onChange={() => {}} select={to} options={categoryUnits} onSelect={(v) => { setTo(v); setResult('—') }} readonly /></div>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<div className="mt-8 flex flex-col justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center"><p className="text-sm text-muted-foreground">{formula}</p><button className="primary-button" onClick={calculateUnits}>Convert <ArrowLeftRight size={16} /></button></div></div></div></section>
    <section id="currency" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-8 lg:px-8"><div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.3)] sm:p-8"><div className="mb-7 flex items-center gap-3"><div className="icon-tile"><Globe2 size={20} /></div><div><p className="section-label">Live exchange rates</p><h3 className="mt-0.5 text-lg font-semibold">Currency exchange</h3></div></div><div className="grid items-end gap-4 xl:grid-cols-[1fr_48px_1fr]"><CurrencyField label="You send" value={currencyValue} onChange={setCurrencyValue} currency={baseCurrency} onCurrency={setBaseCurrency} /><button aria-label="Swap currencies" onClick={() => { setBaseCurrency(targetCurrency); setTargetCurrency(baseCurrency); setCurrencyResult('—') }} className="swap-button"><ArrowLeftRight size={18} /></button><CurrencyField label="You receive" value={currencyResult} onChange={() => {}} currency={targetCurrency} onCurrency={setTargetCurrency} readonly /></div>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}<div className="mt-7 flex flex-col justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center"><div className="text-sm text-muted-foreground">{rate ? <><p className="font-medium text-foreground">1 {baseCurrency} = {formatValue(rate)} {targetCurrency}</p><p className="mt-1 text-xs">Frankfurter · ECB reference rates · {rateDate || 'latest available'}</p></> : <p>Rates are fetched securely when you convert.</p>}</div><button className="primary-button" onClick={calculateCurrency} disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}Convert currency</button></div></div></section>
    <section id="history" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-8 lg:px-8"><div className="rounded-2xl border border-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><p className="section-label">Recent activity</p><h3 className="mt-1 text-lg font-semibold">Conversion history</h3></div><button className="text-xs font-semibold text-primary" onClick={() => setHistory([])}>Clear history</button></div>{history.length ? <div className="grid gap-3">{history.map((item, index) => <div key={`${item.text}-${index}`} className="rounded-xl bg-muted p-4"><div className="flex items-start justify-between gap-4"><div><span className="font-mono text-[10px] uppercase tracking-widest text-primary">{item.kind}</span><p className="mt-1 font-medium">{item.text}</p><p className="mt-1 text-xs text-muted-foreground">{item.formula}</p></div><button aria-label="Copy conversion" onClick={() => navigator.clipboard?.writeText(`${item.text}\n${item.formula}`)} className="text-muted-foreground hover:text-primary"><Copy size={16} /></button></div></div>)}</div> : <p className="text-sm text-muted-foreground">Your recent conversions will appear here.</p>}</div></section>
    <section id="about" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-8 lg:px-8"><div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]"><div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start gap-3"><Info className="mt-1 text-primary" size={20} /><div><p className="section-label">Methodology</p><h3 className="mt-1 text-lg font-semibold">Transparent by design.</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Physical units convert through precise SI base-unit factors. Temperature uses scale-specific offsets. Results are rounded to four decimal places, with scientific notation for extreme values.</p></div></div></div><div className="rounded-2xl border border-border bg-primary p-6 text-primary-foreground"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">Rate source</p><h3 className="mt-3 font-serif text-2xl font-bold">Frankfurter.app</h3><p className="mt-3 text-sm leading-6 opacity-80">ECB reference exchange rates, retrieved server-side and cached for 15 minutes. The returned date is shown beside every live result.</p></div></div></section>
    <footer className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-border px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8"><p>Convertix. / Precision, without the friction.</p><p className="font-mono">LIVE DATA · FRANKFURTER.APP</p></footer>
  </main>
}

function Field({ label, value, onChange, select, options, onSelect, readonly = false }: { label: string; value: string; onChange: (value: string) => void; select: string; options: string[]; onSelect: (value: string) => void; readonly?: boolean }) { return <div><label className="field-label">{label}</label><div className="input-row"><input className="value-input" value={value} onChange={(e) => onChange(e.target.value)} readOnly={readonly} inputMode="decimal" /><div className="select-wrap"><select value={select} onChange={(e) => onSelect(e.target.value)} aria-label={`${label} unit`}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div></div></div> }
function CurrencyField({ label, value, onChange, currency, onCurrency, readonly = false }: { label: string; value: string; onChange: (value: string) => void; currency: string; onCurrency: (value: string) => void; readonly?: boolean }) { return <div><label className="field-label">{label}</label><div className="input-row"><input className="value-input" value={value} onChange={(e) => onChange(e.target.value)} readOnly={readonly} inputMode="decimal" /><div className="select-wrap currency-select"><select value={currency} onChange={(e) => onCurrency(e.target.value)} aria-label={`${label} currency`}>{currencies.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div></div></div> }
