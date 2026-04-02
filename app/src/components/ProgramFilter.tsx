'use client'

/**
 * ProgramFilter — Multi-select airline program filter chips.
 *
 * Extracts unique programs from search results and displays them as
 * horizontally scrollable chips. Active chips use the airline's brand
 * color at 10% opacity. Follows Aperture spec: 36px height, 10px
 * border-radius, Satoshi 500 13px.
 */

// ---------------------------------------------------------------------------
// Program metadata: display names + brand colors
// ---------------------------------------------------------------------------

interface ProgramMeta {
  display: string
  /** Hex color for active state (text + border + bg tint) */
  color: string
}

const PROGRAM_META: Record<string, ProgramMeta> = {
  united:          { display: 'United',          color: '#002244' },
  aeroplan:        { display: 'Aeroplan',        color: '#00613B' },
  delta:           { display: 'Delta',           color: '#003A70' },
  alaska:          { display: 'Alaska',          color: '#01426A' },
  virgin_atlantic: { display: 'Virgin Atlantic', color: '#E01A22' },
  'virgin-atlantic': { display: 'Virgin Atlantic', color: '#E01A22' },
  flying_blue:     { display: 'Flying Blue',     color: '#002F5F' },
  'flying-blue':   { display: 'Flying Blue',     color: '#002F5F' },
  emirates:        { display: 'Emirates',        color: '#D71921' },
  singapore:       { display: 'Singapore',       color: '#D4A017' },
  american:        { display: 'American',        color: '#0078D2' },
  jetblue:         { display: 'JetBlue',         color: '#003876' },
  southwest:       { display: 'Southwest',       color: '#304CB2' },
  british_airways: { display: 'British Airways', color: '#075AAA' },
  'british-airways': { display: 'British Airways', color: '#075AAA' },
  qantas:          { display: 'Qantas',          color: '#E0002A' },
  cathay:          { display: 'Cathay Pacific',  color: '#005D63' },
  ana:             { display: 'ANA',             color: '#00467F' },
  lifemiles:       { display: 'LifeMiles',       color: '#E4002B' },
  smiles:          { display: 'Smiles',          color: '#FF6600' },
  etihad:          { display: 'Etihad',          color: '#BD8B13' },
  eurobonus:       { display: 'EuroBonus',       color: '#000080' },
  aeromexico:      { display: 'Aeromexico',      color: '#00205B' },
  turkish:         { display: 'Turkish',         color: '#C60C30' },
  // Fallback handled in getMetaForProgram
}

function getMetaForProgram(source: string): ProgramMeta {
  const key = source.toLowerCase().trim()
  return PROGRAM_META[key] ?? {
    display: source.charAt(0).toUpperCase() + source.slice(1),
    color: '#64748B', // slate-500 fallback
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProgramFilterProps {
  /** All available programs from the current result set */
  programs: string[]
  /** Currently selected program keys (empty = show all) */
  selected: Set<string>
  /** Toggle a program on/off */
  onToggle: (program: string) => void
  /** Clear all selections */
  onClearAll: () => void
}

export default function ProgramFilter({
  programs,
  selected,
  onToggle,
  onClearAll,
}: ProgramFilterProps) {
  if (programs.length <= 1) return null

  const hasSelection = selected.size > 0

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 -my-1">
      {/* "All" chip — active when nothing is selected */}
      <button
        type="button"
        onClick={onClearAll}
        className={`
          flex-shrink-0 h-9 px-3.5 rounded-chip
          font-heading text-label font-medium
          transition-colors duration-150 ease-smooth
          ${!hasSelection
            ? 'bg-accent-primary text-white'
            : 'border border-border bg-bg-surface text-text-secondary hover:bg-bg-subtle'
          }
        `}
      >
        All
      </button>

      {/* Program chips */}
      {programs.map((program) => {
        const meta = getMetaForProgram(program)
        const isActive = selected.has(program)

        return (
          <button
            key={program}
            type="button"
            onClick={() => onToggle(program)}
            className={`
              flex-shrink-0 h-9 px-3.5 rounded-chip
              font-heading text-label font-medium
              transition-colors duration-150 ease-smooth
              ${!isActive ? 'border border-border bg-bg-surface text-text-secondary hover:bg-bg-subtle' : ''}
            `}
            style={
              isActive
                ? {
                    color: meta.color,
                    backgroundColor: `${meta.color}14`,
                    border: `1px solid ${meta.color}33`,
                  }
                : undefined
            }
          >
            {meta.display}
          </button>
        )
      })}

      {/* Clear filter hint when filters active */}
      {hasSelection && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex-shrink-0 font-body text-caption text-text-tertiary hover:text-text-secondary transition-colors duration-150 ml-1"
        >
          Clear
        </button>
      )}
    </div>
  )
}
