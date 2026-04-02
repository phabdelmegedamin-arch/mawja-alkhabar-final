'use client'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

// ── Button ─────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?:    'sm' | 'md' | 'lg'
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
    const variants = {
      primary:   'bg-ac text-bg hover:bg-ac/90',
      secondary: 'bg-bg3 border border-b-2 text-tx-2 hover:border-ac hover:text-ac',
      danger:    'border border-rd/30 text-rd hover:bg-rd hover:text-bg',
      ghost:     'text-tx-3 hover:text-tx hover:bg-bg3',
    }
    const sizes = { sm: 'text-xs px-2.5 py-1.5', md: 'text-sm px-3 py-2', lg: 'text-base px-4 py-2.5' }
    return (
      <button ref={ref} disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ── Badge ─────────────────────────────────────────
interface BadgeProps { variant?: 'pos' | 'neg' | 'neu' | 'ac' | 'default'; children: React.ReactNode; className?: string }
export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const v = { pos:'bg-pos text-gr border-gr/20', neg:'bg-neg text-rd border-rd/20',
    neu:'bg-neu text-yl border-yl/20', ac:'bg-ac/10 text-ac border-ac/20', default:'bg-bg3 text-tx-2 border-b-2' }
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold border', v[variant], className)}>{children}</span>
}

// ── Input ─────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; hint?: string }
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-tx-2">{label}</label>}
      <input ref={ref} className={cn('w-full px-3 py-2 text-sm rounded-lg bg-bg3 border text-tx placeholder:text-tx-3 transition-all duration-200 focus:outline-none focus:ring-2',
        error ? 'border-rd focus:ring-rd/20' : 'border-b-2 focus:border-ac focus:ring-ac/20', className)} {...props} />
      {error && <p className="text-xs text-rd">{error}</p>}
      {hint  && <p className="text-xs text-tx-3">{hint}</p>}
    </div>
  )
)
Input.displayName = 'Input'

// ── Skeleton ──────────────────────────────────────
export function Skeleton({ className, lines = 1 }: { className?: string; lines?: number }) {
  if (lines > 1) return <div className="space-y-2">{Array.from({length:lines}).map((_,i)=><div key={i} className={cn('shimmer rounded h-4', i===lines-1&&'w-3/4', className)}/>)}</div>
  return <div className={cn('shimmer rounded h-4', className)} />
}

// ── Card ──────────────────────────────────────────
export function Card({ children, className, padding=true }: { children: React.ReactNode; className?: string; padding?: boolean }) {
  return <div className={cn('card', padding&&'p-4', className)}>{children}</div>
}

// ── Dialog ────────────────────────────────────────
export function Dialog({ open, onClose, title, children, maxWidth='max-w-lg' }: {
  open: boolean; onClose: ()=>void; title?: string; children: React.ReactNode; maxWidth?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full card shadow-panel animate-slide-up', maxWidth)}>
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-b-1">
            <h2 className="font-bold text-base">{title}</h2>
            <button onClick={onClose} className="text-tx-3 hover:text-tx text-lg">✕</button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────
export function StatCard({ label, value, sub, color, icon }: { label: string; value: string|number; sub?: string; color?: string; icon?: string }) {
  return (
    <div className="card p-3 flex flex-col gap-1">
      {icon && <div className="text-xl">{icon}</div>}
      <div className="text-xl font-black font-mono" style={color?{color}:undefined}>{value}</div>
      <div className="text-xs text-tx-3">{label}</div>
      {sub && <div className="text-2xs text-tx-3">{sub}</div>}
    </div>
  )
}

// ── Empty ─────────────────────────────────────────
export function Empty({ icon='📭', title, sub, action }: { icon?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="card p-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-base font-bold text-tx-2 mb-1">{title}</div>
      {sub    && <div className="text-sm text-tx-3 max-w-sm mx-auto">{sub}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
