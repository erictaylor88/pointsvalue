export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Hero section with subtle radial gradient */}
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

        {/* Search bar placeholder */}
        <div className="mx-auto rounded-card bg-bg-surface-elevated shadow-search border border-border p-6">
          <p className="font-heading text-label text-text-tertiary uppercase tracking-widest">
            Search coming soon
          </p>
        </div>
      </div>
    </main>
  )
}
