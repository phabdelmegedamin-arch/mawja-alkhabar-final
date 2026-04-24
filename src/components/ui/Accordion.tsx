'use client'
import { useState, ReactNode } from 'react'

interface AccordionProps {
  /** العنوان الرئيسي (يسار الصف) */
  title: ReactNode
  /** نص ثانوي أو وصف قصير تحت العنوان */
  subtitle?: ReactNode
  /** شارة أو رقم ملوّن (بجانب العنوان) */
  badge?: ReactNode
  /** معاينة مختصرة تظهر فقط عند الإغلاق (يمين الصف) */
  preview?: ReactNode
  /** محتوى الـ accordion — يظهر عند الفتح */
  children: ReactNode
  /** هل مفتوح افتراضياً */
  defaultOpen?: boolean
  /** لون الخط الجانبي للتمييز البصري */
  accentColor?: string
  /** class إضافي */
  className?: string
  /** حجم البادج */
  size?: 'sm' | 'md'
}

export default function Accordion({
  title,
  subtitle,
  badge,
  preview,
  children,
  defaultOpen = false,
  accentColor,
  className = '',
  size = 'md',
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`card overflow-hidden transition-all ${className}`}
      style={{
        borderRight: accentColor ? `3px solid ${accentColor}` : undefined,
      }}
    >
      {/* Header (clickable) */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right hover:bg-[var(--bg3)] transition-colors"
      >
        {/* Chevron */}
        <span
          className="shrink-0 flex items-center justify-center w-5 h-5"
          style={{
            color:     'var(--t2)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition:'transform 0.2s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2 L8 6 L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        {/* Badge */}
        {badge && (
          <span className="shrink-0">{badge}</span>
        )}

        {/* Title block */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span
            className={`${size === 'sm' ? 'text-[13px]' : 'text-[14px]'} font-medium truncate`}
            style={{ color: 'var(--tx)' }}
          >
            {title}
          </span>
          {subtitle && (
            <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
              {subtitle}
            </span>
          )}
        </div>

        {/* Preview (shown only when closed) */}
        {preview && !open && (
          <div className="shrink-0 hidden sm:block" style={{ color: 'var(--t2)' }}>
            {preview}
          </div>
        )}
      </button>

      {/* Content */}
      {open && (
        <div
          className="animate-slide-up"
          style={{ borderTop: '1px solid var(--b1)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
