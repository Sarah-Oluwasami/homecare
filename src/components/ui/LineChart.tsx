import { useId } from 'react'

import { cn } from '@/lib/cn'

export interface LinePoint {
  label: string
  value: number
}

interface LineChartProps {
  points: LinePoint[]
  /** Compact form for axis ticks. */
  formatTick: (value: number) => string
  /** Full precision for the accessible table — a screen reader shouldn't
   *  only get the rounded axis figure. */
  formatValue: (value: number) => string
  caption: string
  columns?: [string, string]
}

/*
 * Tick text is sized in viewBox units, not CSS pixels: the SVG scales to the
 * container, so a `text-[13px]` class would render at ~6px inside a 320px
 * viewport. 20 units lands near 9px there and 13px on a desktop panel — and the
 * padding below is sized to fit "₦14.5M" at that size.
 */
const WIDTH = 640
const HEIGHT = 240
const TICK_SIZE = 20
const PAD = { top: 14, right: 14, bottom: 34, left: 78 }

/** Rounds up to a readable axis ceiling: 293,950 → 300,000. */
function ceiling(max: number): number {
  if (max <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / (magnitude / 2)) * (magnitude / 2)
}

/**
 * Dependency-free trend line. The path is decorative; the same figures are
 * exposed as a visually-hidden table so the trend isn't sighted-only.
 */
export function LineChart({
  points,
  formatTick,
  formatValue,
  caption,
  columns = ['Period', 'Value'],
}: LineChartProps) {
  const gradientId = useId()
  if (points.length < 2) return null

  const max = ceiling(Math.max(...points.map((p) => p.value)))
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const step = plotW / (points.length - 1)

  const coords = points.map((p, i) => ({
    ...p,
    x: PAD.left + i * step,
    y: PAD.top + (1 - p.value / max) * plotH,
  }))

  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `${PAD.left},${PAD.top + plotH} ${line} ${PAD.left + plotW},${PAD.top + plotH}`
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-hidden="true"
        focusable="false"
        // aspect ratio rather than a fixed height: with `meet` scaling a fixed
        // height letterboxes the plot and shrinks the tick text to ~4px at 320.
        className="aspect-[640/240] w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => {
          const y = PAD.top + (1 - t) * plotH
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y}
                y2={y}
                className="text-line"
                stroke="currentColor"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.left - 10}
                y={y + TICK_SIZE / 3}
                textAnchor="end"
                fontSize={TICK_SIZE}
                className="fill-current"
              >
                {formatTick(max * t)}
              </text>
            </g>
          )
        })}

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((c) => (
          <circle key={c.label} cx={c.x} cy={c.y} r={2.5} fill="currentColor" />
        ))}

        {coords.map((c, i) => (
          <text
            key={`${c.label}-tick`}
            x={c.x}
            y={HEIGHT - 10}
            textAnchor="middle"
            fontSize={TICK_SIZE}
            /* Twelve labels collide below ~30px of width each; on narrow
               viewports only every third one is drawn. The sr-only table
               carries the full set regardless. */
            className={cn(
              'fill-current',
              i % 3 !== 0 && i !== points.length - 1 && 'max-sm:hidden',
            )}
          >
            {c.label}
          </text>
        ))}
      </svg>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{columns[0]}</th>
            <th scope="col">{columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{formatValue(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
