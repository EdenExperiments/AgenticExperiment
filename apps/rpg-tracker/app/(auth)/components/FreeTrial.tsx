export default function FreeTrial() {
  return (
    <div
      className="text-center px-4 py-3 rounded-xl text-sm"
      style={{
        backgroundColor: 'var(--color-accent-muted)',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
        14-day free trial
      </span>
      {' '}— no credit card required. Explore everything at your own pace.
    </div>
  )
}
