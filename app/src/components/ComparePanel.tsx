'use client'

/**
 * ComparePanel — Side-by-side flight comparison.
 *
 * Desktop: right-side panel, 420px width, slides from right.
 * Mobile: bottom sheet, slides up to 60% viewport height.
 * Max 4 flights. Shows condensed cards with CPM, miles, cash price.
 *
 * Per Aperture spec: backdrop-filter blur, frosted glass effect.
 */

import { useCallback } from 'react'
import type { SearchResultItem } from '@/app/api/search/route'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComparePanelProps {
  items: SearchResultItem[]
  isOpen: boolean
  onClose: () => void
  onRemove: (id: string) => void
  onClear: () => void
}

// ---------------------------------------------------------------------------
// Deal quality helpers
// ---------------------------------------------------------------------------

type DealQuality = 'great' | 'fair' | 'below' | 'negative' | 'unknown'

function getDealQuality(item: SearchResultItem): DealQuality {
  if (!item.cpm.cashPriceAvailable) return 'unknown'
  return item.cpm.dealQuality as DealQuality
}

const DEAL_CONFIG: Record<DealQuality, { label: string; textClass: string; bgClass: string; dotColor: string }> = {
  great:    { label: 'GREAT DEAL',    textClass: 'text-deal-great',    bgClass: 'bg-deal-great-bg',    dotColor: 'bg-deal-great' },
  fair:     { label: 'FAIR',          textClass: 'text-deal-fair',     bgClass: 'bg-deal-fair-bg',     dotColor: 'bg-deal-fair' },
  below:    { label: 'BELOW AVG',     textClass: 'text-deal-below',    bgClass: 'bg-deal-below-bg',    dotColor: 'bg-deal-below' },
  negative: { label: 'PAY CASH',      textClass: 'text-deal-negative', bgClass: 'bg-deal-negative-bg', dotColor: 'bg-deal-negative' },
  unknown:  { label: 'NO CASH PRICE', textClass: 'text-text-tertiary', bgClass: 'bg-bg-subtle',        dotColor: 'bg-text-tertiary' },
}

function getCpmColorClass(quality: DealQuality): string {
  switch (quality) {
    case 'great': return 'text-deal-great'
    case 'fair': return 'text-deal-fair'
    case 'negative': return 'text-deal-negative'
    default: return 'text-deal-below'
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatMiles(miles: number): string {
  return miles >= 1000 ? `${Math.round(miles / 1000)}K` : miles.toLocaleString()
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatCurrencyExact(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCpm(cpm: number): string { return cpm.toFixed(1) }

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CloseIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
      <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
      <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Condensed compare card
// ---------------------------------------------------------------------------

function CompareCard({
  item,
  onRemove,
}: {
  item: SearchResultItem
  onRemove: () => void
}) {
  const quality = getDealQuality(item)
  const dealConfig = DEAL_CONFIG[quality]
  const cpmColor = getCpmColorClass(quality)

  return (
    <div className="bg-bg-primary border border-border rounded-chip p-3 relative group">
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="
          absolute top-2 right-2 w-6 h-6
          flex items-center justify-center rounded-full
          text-text-tertiary hover:text-deal-negative hover:bg-deal-negative-bg
          transition-colors duration-150 ease-smooth
          opacity-0 group-hover:opacity-100 focus:opacity-100
        "
        aria-label="Remove from compare"
      >
        <RemoveIcon />
      </button>

      {/* Program + Route */}
      <div className="flex items-center gap-2 mb-2 pr-6">
        <span className="font-heading text-overline text-text-tertiary uppercase tracking-widest">
          {capitalize(item.source)}
        </span>
        <span className="text-text-tertiary">·</span>
        <span className="font-heading text-label font-bold text-text-primary">
          {item.origin} → {item.destination}
        </span>
      </div>

      {/* CPM + Deal badge */}
      <div className="flex items-center gap-2 mb-2">
        {item.cpm.cashPriceAvailable ? (
          <span className={`font-mono text-data font-medium ${cpmColor}`}>
            {formatCpm(item.cpm.cpm)}¢/mi
          </span>
        ) : (
          <span className="font-mono text-data-sm text-text-tertiary">— ¢/mi</span>
        )}
        <span className={`inline-flex items-center gap-1 px-2 h-5 rounded-badge ${dealConfig.bgClass}`}>
          <span className={`w-1 h-1 rounded-full ${dealConfig.dotColor}`} />
          <span className={`font-heading text-[10px] uppercase tracking-widest ${dealConfig.textClass}`}>
            {dealConfig.label}
          </span>
        </span>
      </div>

      {/* Miles + Cash + Taxes */}
      <div className="flex items-center gap-4 font-mono text-data-sm">
        <span className="text-text-primary">
          {formatMiles(item.milesRequired)} mi
        </span>
        {item.taxesUsd > 0 && (
          <span className="text-text-tertiary">
            +{formatCurrencyExact(item.taxesUsd)}
          </span>
        )}
        {item.cashPrice !== null && (
          <span className="text-text-secondary">
            Cash {formatCurrency(item.cashPrice)}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export const MAX_COMPARE_ITEMS = 4

export default function ComparePanel({
  items,
  isOpen,
  onClose,
  onRemove,
  onClear,
}: ComparePanelProps) {
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (!isOpen && items.length === 0) return null

  return (
    <>
      {/* Backdrop — only when panel is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:bg-transparent"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Floating compare counter — shown when panel is closed but items exist */}
      {!isOpen && items.length > 0 && (
        <button
          type="button"
          onClick={onClose} // onClose toggles — parent handles open/close
          className="
            fixed bottom-6 right-6 z-40
            flex items-center gap-2 px-4 py-3
            bg-accent-primary text-white
            rounded-card shadow-card-hover
            font-heading text-label font-medium
            hover:bg-accent-primary-hover
            transition-all duration-250 ease-smooth
            active:scale-[0.97]
          "
        >
          <svg className="w-4.5 h-4.5" viewBox="0 0 18 18" fill="currentColor">
            <path d="M3 3.75C3 2.92157 3.67157 2.25 4.5 2.25H13.5C14.3284 2.25 15 2.92157 15 3.75V16.5L9 13.125L3 16.5V3.75Z" />
          </svg>
          Compare ({items.length})
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          className={`
            fixed z-50
            /* Mobile: bottom sheet */
            inset-x-0 bottom-0 max-h-[70vh]
            /* Desktop: right panel */
            md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px]
            bg-bg-surface-elevated/95 backdrop-blur-xl
            border-t md:border-t-0 md:border-l border-border
            shadow-card-hover
            flex flex-col
            transition-transform duration-350 ease-decel
          `}
          role="complementary"
          aria-label="Compare flights"
        >
          {/* Mobile drag handle */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-bg-muted" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-heading text-h2 font-bold text-text-primary">
              Compare
              <span className="text-text-tertiary font-normal ml-1">({items.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="font-heading text-label text-text-tertiary hover:text-deal-negative transition-colors duration-150"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-bg-subtle transition-colors duration-150"
                aria-label="Close compare panel"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {items.length === 0 ? (
              <div className="text-center py-10">
                <svg className="w-10 h-10 mx-auto text-text-tertiary mb-3" viewBox="0 0 40 40" fill="none">
                  <path
                    d="M8 8.5C8 6.84315 9.34315 5.5 11 5.5H29C30.6569 5.5 32 6.84315 32 8.5V35.5L20 29.5L8 35.5V8.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="font-heading text-h3 font-medium text-text-primary mb-1">
                  No flights to compare
                </p>
                <p className="font-body text-body text-text-secondary max-w-[280px] mx-auto">
                  Tap the bookmark icon on any result to add it here for side-by-side comparison.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <CompareCard
                    key={item.id}
                    item={item}
                    onRemove={() => onRemove(item.id)}
                  />
                ))}

                {items.length >= MAX_COMPARE_ITEMS && (
                  <p className="font-body text-caption text-text-tertiary text-center pt-1">
                    Maximum {MAX_COMPARE_ITEMS} flights. Remove one to add another.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer — best value summary when 2+ items */}
          {items.length >= 2 && (
            <div className="px-5 py-3 border-t border-border bg-bg-subtle/50">
              {(() => {
                const withCpm = items.filter(i => i.cpm.cashPriceAvailable)
                if (withCpm.length < 2) return null
                const best = withCpm.reduce((a, b) => a.cpm.cpm > b.cpm.cpm ? a : b)
                const bestQuality = getDealQuality(best)
                const bestColor = getCpmColorClass(bestQuality)
                return (
                  <p className="font-body text-caption text-text-secondary text-center">
                    Best value:{' '}
                    <span className="font-heading font-medium text-text-primary">{capitalize(best.source)}</span>
                    {' '}at{' '}
                    <span className={`font-mono font-medium ${bestColor}`}>{formatCpm(best.cpm.cpm)}¢/mi</span>
                  </p>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </>
  )
}
