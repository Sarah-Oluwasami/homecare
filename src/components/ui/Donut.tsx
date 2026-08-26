import { cn } from '@/lib/cn'

export interface DonutSegment {
  id: string
  label: string
  value: number
  /** Tailwind text-* class; the arc inherits it via `stroke="currentColor"`. */
  colourClass: string
}

interface DonutProps {
  segments: DonutSegment[]
  /** Rendered inside the ring. */
  centreLabel: string
  centreValue: string
  /** Caption for the visually-hidden data table. */
  caption: string
  /** Table headers — "Amount" is wrong when the value is a headcount. */
  columns?: [string, string, string]
  formatValue: (value: number) => string
}

const RADIUS = 45
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const STROKE = 18

/**
 * Dependency-free donut. The arcs are decorative; the same numbers are exposed
 * as a visually-hidden table so the split isn't sighted-only.
 */
export function Donut({
  segments,
  centreLabel,
  centreValue,
  caption,
  columns = ['Item', 'Value', 'Share'],
  formatValue,
}: DonutProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  // Built with reduce rather than a mutable accumulator inside map — a
  // reassigned closure variable during render is a lint error here, and
  // rightly so: it would desync on a re-entrant render.
  const arcs = segments.reduce<
    ((typeof segments)[number] & {
      fraction: number
      dash: number
      dashOffset: number
    })[]
  >((acc, s) => {
    const consumed = acc.reduce((sum, a) => sum + a.fraction, 0)
    const fraction = total === 0 ? 0 : s.value / total
    return [
      ...acc,
      {
        ...s,
        fraction,
        dash: fraction * CIRCUMFERENCE,
        // Negative because the stroke is drawn clockwise from 12 o'clock.
        dashOffset: -consumed * CIRCUMFERENCE,
      },
    ]
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="relative shrink-0">
        <svg
          viewBox="0 0 120 120"
          aria-hidden="true"
          focusable="false"
          className="size-28 -rotate-90 sm:size-36"
        >
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            className="text-sunken"
            stroke="currentColor"
            strokeWidth={STROKE}
          />
          {arcs.map((a) => (
            <circle
              key={a.id}
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              className={a.colourClass}
              strokeWidth={STROKE}
              strokeDasharray={`${a.dash} ${CIRCUMFERENCE - a.dash}`}
              strokeDashoffset={a.dashOffset}
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-ink-subtle text-[0.6rem] font-semibold tracking-wider uppercase">
              {centreLabel}
            </p>
            <p className="text-ink text-lg font-bold tracking-tight tabular-nums">
              {centreValue}
            </p>
          </div>
        </div>
      </div>

      {/* Visual only — the sr-only table below is the accessible form, and
          exposing both would announce every figure twice.
          basis-44 gives the legend a wrap threshold; with flex-basis 0 the row
          never wraps and the values get clipped by the card at 320px. */}
      <ul aria-hidden="true" className="min-w-0 grow basis-44 space-y-2">
        {arcs.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'size-2.5 shrink-0 rounded-sm bg-current',
                  a.colourClass,
                )}
              />
              <span className="text-ink-muted break-words">{a.label}</span>
            </span>
            <span className="text-ink shrink-0 font-semibold tabular-nums">
              {formatValue(a.value)}
              <span className="text-ink-subtle ml-1 font-normal">
                ({Math.round(a.fraction * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{columns[0]}</th>
            <th scope="col">{columns[1]}</th>
            <th scope="col">{columns[2]}</th>
          </tr>
        </thead>
        <tbody>
          {arcs.map((a) => (
            <tr key={a.id}>
              <th scope="row">{a.label}</th>
              <td>{formatValue(a.value)}</td>
              <td>{Math.round(a.fraction * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
