import SearchForm from '@/components/SearchForm'

// ---------------------------------------------------------------------------
// Icons for feature cards
// ---------------------------------------------------------------------------

function SearchRouteIcon() {
  return (
    <svg className="w-8 h-8 text-accent-primary" viewBox="0 0 32 32" fill="none">
      <circle cx="10" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="22" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 16H19" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      <path d="M4 16H7M25 16H28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ValueIcon() {
  return (
    <svg className="w-8 h-8 text-accent-primary" viewBox="0 0 32 32" fill="none">
      <path d="M16 6V26M10 12L16 6L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="6" y="24" width="20" height="2" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

function MathIcon() {
  return (
    <svg className="w-8 h-8 text-accent-primary" viewBox="0 0 32 32" fill="none">
      <rect x="5" y="5" width="22" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 16H22M16 10V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ProgramsIcon() {
  return (
    <svg className="w-8 h-8 text-accent-primary" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="8" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="8" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="19" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="19" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <main className="flex flex-col items-center">
      {/* ── Hero Section ── */}
      <section className="relative w-full flex flex-col items-center pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6">
        {/* Subtle gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px]"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(67, 56, 202, 0.06) 0%, transparent 70%)',
            }}
          />
        </div>

        <h1 className="font-display text-display-sm sm:text-display text-text-primary mb-3 text-center">
          Find the Real Value of Award Flights
        </h1>
        <p className="font-body text-body text-text-secondary max-w-prose mx-auto mb-8 sm:mb-10 text-center">
          Stop guessing whether your miles are worth it. PointsValue computes
          the cents-per-mile value of every award flight — so you can see
          instantly if a deal is great, fair, or not worth the points.
        </p>

        <SearchForm />
      </section>

      {/* ── How It Works ── */}
      <section className="w-full bg-bg-surface border-y border-border py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-content mx-auto">
          <h2 className="font-heading text-h1 font-bold text-text-primary text-center mb-3">
            How It Works
          </h2>
          <p className="font-body text-body text-text-secondary text-center max-w-prose mx-auto mb-12">
            Three steps from search to certainty. No spreadsheets required.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            <div className="text-center sm:text-left">
              <div className="flex justify-center sm:justify-start mb-4">
                <div className="w-12 h-12 rounded-card bg-accent-primary-light dark:bg-accent-primary/20 flex items-center justify-center">
                  <SearchRouteIcon />
                </div>
              </div>
              <p className="font-heading text-overline text-accent-primary uppercase tracking-widest mb-2">
                01
              </p>
              <p className="font-heading text-h3 font-medium text-text-primary mb-2">
                Search a route
              </p>
              <p className="font-body text-body text-text-secondary">
                Enter your origin, destination, and travel date. We check 25+
                mileage programs for award availability via Seats.aero.
              </p>
            </div>
            <div className="text-center sm:text-left">
              <div className="flex justify-center sm:justify-start mb-4">
                <div className="w-12 h-12 rounded-card bg-accent-primary-light dark:bg-accent-primary/20 flex items-center justify-center">
                  <ValueIcon />
                </div>
              </div>
              <p className="font-heading text-overline text-accent-primary uppercase tracking-widest mb-2">
                02
              </p>
              <p className="font-heading text-h3 font-medium text-text-primary mb-2">
                See the real value
              </p>
              <p className="font-body text-body text-text-secondary">
                Every result shows the cents-per-mile value — computed from the
                actual cash price of the same flight via Google Flights.
              </p>
            </div>
            <div className="text-center sm:text-left">
              <div className="flex justify-center sm:justify-start mb-4">
                <div className="w-12 h-12 rounded-card bg-accent-primary-light dark:bg-accent-primary/20 flex items-center justify-center">
                  <MathIcon />
                </div>
              </div>
              <p className="font-heading text-overline text-accent-primary uppercase tracking-widest mb-2">
                03
              </p>
              <p className="font-heading text-h3 font-medium text-text-primary mb-2">
                Show the math
              </p>
              <p className="font-body text-body text-text-secondary">
                Miles cost, cash price, taxes, and the formula. No black boxes
                — you see exactly how we got the number.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why PointsValue ── */}
      <section className="w-full py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-content mx-auto">
          <h2 className="font-heading text-h1 font-bold text-text-primary text-center mb-3">
            Why PointsValue?
          </h2>
          <p className="font-body text-body text-text-secondary text-center max-w-prose mx-auto mb-12">
            The points community has great tools for finding availability. What
            was missing is a quick way to know if that availability is actually
            a good deal.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-surface border border-border rounded-card p-6">
              <p className="font-heading text-h3 font-medium text-text-primary mb-2">
                Real-time CPM computation
              </p>
              <p className="font-body text-body text-text-secondary">
                We pull live cash pricing for the same route and date, then
                compute the actual cents-per-mile value. Not a static chart —
                real math on real prices.
              </p>
            </div>
            <div className="bg-bg-surface border border-border rounded-card p-6">
              <p className="font-heading text-h3 font-medium text-text-primary mb-2">
                Deal quality at a glance
              </p>
              <p className="font-body text-body text-text-secondary">
                Every result is color-coded against baseline program valuations.
                Green for great deals, amber for fair, gray for below average.
                No CPM expertise required.
              </p>
            </div>
            <div className="bg-bg-surface border border-border rounded-card p-6">
              <p className="font-heading text-h3 font-medium text-text-primary mb-2">
                25+ mileage programs
              </p>
              <p className="font-body text-body text-text-secondary">
                United, American, Delta, Alaska, Aeroplan, Virgin Atlantic,
                Flying Blue, Emirates, Singapore, and more. Search across all
                of them at once.
              </p>
            </div>
            <div className="bg-bg-surface border border-border rounded-card p-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-heading text-h3 font-medium text-text-primary">
                  Transparent methodology
                </p>
              </div>
              <p className="font-body text-body text-text-secondary">
                Every calculation shows its work: miles cost, cash price, taxes,
                the formula, and the baseline it was scored against. If
                you&apos;re skeptical, verify it yourself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Programs Strip ── */}
      <section className="w-full bg-bg-surface border-y border-border py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-content mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <ProgramsIcon />
            <h2 className="font-heading text-h2 font-bold text-text-primary">
              Programs We Cover
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-[600px] mx-auto">
            {[
              'United', 'Aeroplan', 'Delta', 'Alaska', 'American',
              'Virgin Atlantic', 'Flying Blue', 'Emirates', 'Singapore',
              'JetBlue', 'British Airways', 'Qantas', 'Cathay Pacific',
              'ANA', 'LifeMiles', 'Etihad', 'Turkish', 'EuroBonus',
            ].map((name) => (
              <span
                key={name}
                className="px-3 py-1.5 bg-bg-primary border border-border rounded-chip font-heading text-label text-text-secondary"
              >
                {name}
              </span>
            ))}
            <span className="px-3 py-1.5 bg-accent-primary-light dark:bg-accent-primary/20 border border-accent-primary-subtle dark:border-accent-primary/30 rounded-chip font-heading text-label text-accent-primary">
              + more
            </span>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-full py-16 sm:py-20 px-4 sm:px-6 text-center">
        <div className="max-w-search mx-auto">
          <h2 className="font-heading text-h1 font-bold text-text-primary mb-3">
            Ready to find your next great deal?
          </h2>
          <p className="font-body text-body text-text-secondary max-w-prose mx-auto mb-8">
            Search any route and see the real value of your miles. Free to use,
            no account required.
          </p>
          <SearchForm />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-content mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-display text-[18px] text-text-primary">
              PointsValue
            </span>
            <span className="font-body text-caption text-text-tertiary">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-4 font-body text-caption text-text-tertiary">
            <span>Award data from Seats.aero</span>
            <span className="text-border">·</span>
            <span>Cash prices from Google Flights</span>
            <span className="text-border hidden sm:inline">·</span>
            <a
              href="https://pointsforecast.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline text-accent-primary hover:text-accent-primary-hover transition-colors"
            >
              PointsForecast
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
