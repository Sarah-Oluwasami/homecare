import { cn } from '@/lib/cn'

interface SparklineProps {
  /** Oldest → newest. Needs at least two points to draw a line. */
  series: number[]
  /** Spoken alongside the values, e.g. "mg/dL". */
  unit: string
  label: string
  className?: string
}

const WIDTH = 100
const HEIGHT = 28
const PAD = 3

/**
 * Dependency-free trend line. The SVG is decorative; the numbers are exposed
 * as visually-hidden text so the trend isn't sighted-only.
 */
export function Sparkline({ series, unit, label, className }: SparklineProps) {
  const text = (
    <span className="sr-only">
      {label} trend, oldest to newest: {series.join(', ')} {unit}.
    </span>
  )

  // One point can't make a line, but the reading is still worth announcing.
  if (series.length < 2) return text

  const min = Math.min(...series)
  const max = Math.max(...series)
  const flat = max === min
  const step = (WIDTH - PAD * 2) / (series.length - 1)

  const points = series
    .map((n, i) => {
      const x = PAD + i * step
      // A flat series has no range to normalise against; centre it instead.
      const y = flat
        ? HEIGHT / 2
        : PAD + (1 - (n - min) / (max - min)) * (HEIGHT - PAD * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        className={cn('h-7 w-24', className)}
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {text}
    </>
  )
}
