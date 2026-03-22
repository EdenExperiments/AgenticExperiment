'use client'

export default function NutriPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      {/* Minimal theme content */}
      <div className="nutri-placeholder w-full max-w-md space-y-3">
        <h1
          className="nutri-placeholder__title text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
          }}
        >
          Coming Soon — NutriLog
        </h1>
        <p className="nutri-placeholder__description text-sm leading-relaxed">
          Nutrition tracking is coming in a future update. Track macros, calories,
          and weight trends — built on the same progression philosophy as LifeQuest.
          LifeQuest is fully available now.
        </p>
      </div>
    </div>
  )
}
