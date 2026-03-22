export default function NutriPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
      <span className="text-5xl" role="img" aria-label="salad">🥗</span>
      <h1
        className="text-2xl font-bold"
        style={{
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
          color: 'var(--color-text)',
        }}
      >
        NutriLog
      </h1>
      <p className="max-w-sm" style={{ color: 'var(--color-muted)' }}>
        Nutrition tracking is coming in a future update. LifeQuest is fully available now.
      </p>
    </div>
  )
}
