import SearchForm from '@/components/SearchForm'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Hero gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(67, 56, 202, 0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="w-full max-w-search text-center">
        <h1 className="font-display text-display text-text-primary mb-3">
          PointsValue
        </h1>
        <p className="font-body text-body text-text-secondary max-w-prose mx-auto mb-10">
          Instantly see if an award flight is a good deal. We bridge mileage
          costs with cash pricing to compute the real cents-per-mile value of
          every result.
        </p>

        <SearchForm />

        {/* How it works */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left max-w-content mx-auto">
          <div>
            <p className="font-heading text-overline text-accent-primary uppercase tracking-widest mb-2">
              01
            </p>
            <p className="font-heading text-h3 font-medium text-text-primary mb-1">
              Search a route
            </p>
            <p className="font-body text-caption text-text-secondary">
              Enter your origin, destination, and travel date. We check 25+ mileage programs for award availability.
            </p>
          </div>
          <div>
            <p className="font-heading text-overline text-accent-primary uppercase tracking-widest mb-2">
              02
            </p>
            <p className="font-heading text-h3 font-medium text-text-primary mb-1">
              See the real value
            </p>
            <p className="font-body text-caption text-text-secondary">
              Every result shows the cents-per-mile value — computed from the actual cash price of the same flight.
            </p>
          </div>
          <div>
            <p className="font-heading text-overline text-accent-primary uppercase tracking-widest mb-2">
              03
            </p>
            <p className="font-heading text-h3 font-medium text-text-primary mb-1">
              Show the math
            </p>
            <p className="font-body text-caption text-text-secondary">
              Miles cost, cash price, taxes, and the formula. No black boxes — you see exactly how we got the number.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
