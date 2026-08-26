import { useId, useMemo } from 'react'
import {
  boundsOf,
  branchPlaces,
  fitAspect,
  placeOfRecipient,
  projectionFor,
  recipientPlaces,
} from './locations-data'
import type { Point } from './locations-data'
import { stateLabels } from './live-data'
import type { LiveAlert, LiveVisit } from './live-data'
import {
  gradeDot,
  gradeFill,
  gradeOf,
  gradeStroke,
  pinGradeLabels,
} from './pin-grade'
import type { PinGrade } from './pin-grade'
import { cn } from '@/lib/cn'

/* ---------------------------------- pins ----------------------------------- */

interface Pin {
  /** Every visit at this address, so two at one house are one pin. */
  visits: LiveVisit[]
  grade: PinGrade
  x: number
  y: number
}

const gradeRank: Record<PinGrade, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  clear: 3,
}

interface VisitMapProps {
  visits: LiveVisit[]
  alerts: LiveAlert[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/**
 * A locality plot, not a street map.
 *
 * Every point is the client's own address, projected from real coordinates, so
 * relative positions and the scale bar are true. There is no basemap: this app
 * ships no tiles and drawing invented roads under real points would be worse
 * than drawing none. Nothing here is a caregiver's live position — the app has
 * no device feed, and a moving dot would be a claim it cannot make.
 */
export function VisitMap({
  visits,
  alerts,
  selectedId,
  onSelect,
}: VisitMapProps) {
  const gridId = useId()

  const { projection, scale } = useMemo(() => {
    // Framed on what is actually drawn — clients and branches. Staff homes are
    // never plotted, and padding the window around them framed empty space.
    const drawn: Point[] = [
      ...Object.values(recipientPlaces),
      ...Object.values(branchPlaces),
    ]
    const proj = projectionFor(fitAspect(boundsOf(drawn), 4 / 3), 800)

    const target = proj.width * 0.25 * proj.milesPerUnit
    const nice = [0.25, 0.5, 1, 2, 5, 10].reduce((best, m) =>
      Math.abs(m - target) < Math.abs(best - target) ? m : best,
    )
    return { projection: proj, scale: { miles: nice, units: nice / proj.milesPerUnit } }
  }, [])

  /** One pin per address. Eleanor Davis has two visits at one house. */
  const pins = useMemo(() => {
    const byPlace = new Map<string, Pin>()

    for (const visit of visits) {
      const place = placeOfRecipient(visit.recipientId)
      if (!place) continue
      const grade = gradeOf(visit, alerts)
      const existing = byPlace.get(visit.recipientId)

      if (existing) {
        existing.visits.push(visit)
        // The pin shows the worst thing happening at that address.
        if (gradeRank[grade] < gradeRank[existing.grade]) existing.grade = grade
      } else {
        byPlace.set(visit.recipientId, {
          visits: [visit],
          grade,
          ...projection.project(place),
        })
      }
    }
    return [...byPlace.values()].sort((a, b) => gradeRank[b.grade] - gradeRank[a.grade])
  }, [visits, alerts, projection])

  const branchPins = Object.entries(branchPlaces).map(([name, place]) => ({
    name,
    ...projection.project(place),
  }))

  const dropped = visits.length - pins.reduce((n, p) => n + p.visits.length, 0)

  return (
    <figure className="m-0">
      {/*
        `role="group"`, not `role="img"`: an image role prunes the subtree, and
        every pin below is a button. The three unassigned visits are reachable
        only here, so hiding them from assistive tech hid the day's only
        critical alert.
      */}
      <div className="border-line bg-sunken/50 overflow-hidden rounded-xl border">
        <svg
          viewBox={`0 0 ${projection.width} ${projection.height}`}
          role="group"
          aria-label={`Locality plot: ${pins.length} address${pins.length === 1 ? '' : 'es'} and ${branchPins.length} branches`}
          className="block h-auto w-full min-h-64"
        >
          <defs>
            <pattern
              id={gridId}
              width={scale.units}
              height={scale.units}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${scale.units} 0 L 0 0 0 ${scale.units}`}
                fill="none"
                className="stroke-line"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </pattern>
          </defs>
          <rect
            width={projection.width}
            height={projection.height}
            fill={`url(#${gridId})`}
          />

          {/* Branch offices, drawn as squares so they never read as visits. */}
          {branchPins.map((b) => (
            <g key={b.name}>
              <rect
                x={b.x - 9}
                y={b.y - 9}
                width={18}
                height={18}
                rx={3}
                className="fill-ink-subtle"
              />
              <text
                x={b.x}
                y={b.y - 16}
                textAnchor="middle"
                fontSize={22}
                className="fill-ink-muted font-medium"
              >
                {b.name.replace(' Branch', '')}
              </text>
            </g>
          ))}

          {pins.map((pin) => {
            const selected = pin.visits.some((v) => v.id === selectedId)
            const label = pin.visits
              .map((v) => `${v.recipientName}, ${stateLabels[v.state]}`)
              .join('; ')
            return (
              <g
                key={pin.visits[0].recipientId}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`${label}. ${pinGradeLabels[pin.grade]}.`}
                onClick={() => onSelect(pin.visits[0].id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(pin.visits[0].id)
                  }
                }}
                className="cursor-pointer"
              >
                <title>
                  {label}
                  {pin.visits.length > 1 && ` (${pin.visits.length} visits here)`}
                </title>
                {selected && (
                  <circle cx={pin.x} cy={pin.y} r={26} className="fill-brand-200" />
                )}
                {/* A 24px target at the smallest render width. */}
                <circle cx={pin.x} cy={pin.y} r={20} fill="transparent" />
                <circle cx={pin.x} cy={pin.y} r={15} className="fill-white" />
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={12}
                  className={gradeFill[pin.grade]}
                />
                {/* Shape as well as colour: an outer ring for anything that
                    needs a person, doubled when it needs one now. */}
                {pin.grade !== 'clear' && (
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={20}
                    fill="none"
                    className={gradeStroke[pin.grade]}
                    strokeWidth={3}
                    strokeDasharray={pin.grade === 'medium' ? '5 4' : undefined}
                  />
                )}
                {pin.grade === 'critical' && (
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={26}
                    fill="none"
                    className="stroke-red-600"
                    strokeWidth={2}
                  />
                )}
                {pin.visits.length > 1 && (
                  <text
                    x={pin.x}
                    y={pin.y + 6}
                    textAnchor="middle"
                    fontSize={17}
                    className="fill-white font-bold"
                  >
                    {pin.visits.length}
                  </text>
                )}
              </g>
            )
          })}

          {/* Scale bar, computed from the projection rather than drawn to look
              plausible. */}
          <g transform={`translate(20 ${projection.height - 28})`}>
            <rect
              x={-8}
              y={-26}
              width={scale.units + 16}
              height={42}
              rx={5}
              className="fill-canvas"
              opacity={0.92}
            />
            <line
              x1={0}
              y1={0}
              x2={scale.units}
              y2={0}
              className="stroke-ink-muted"
              strokeWidth={3}
            />
            <line x1={0} y1={-6} x2={0} y2={6} className="stroke-ink-muted" strokeWidth={3} />
            <line
              x1={scale.units}
              y1={-6}
              x2={scale.units}
              y2={6}
              className="stroke-ink-muted"
              strokeWidth={3}
            />
            <text x={0} y={-11} fontSize={22} className="fill-ink-muted">
              {scale.miles} {scale.miles === 1 ? 'mile' : 'miles'}
            </text>
          </g>
        </svg>
      </div>

      <figcaption className="text-ink-subtle mt-2 text-xs">
        Each pin is a client&rsquo;s home address; a numbered pin is more than
        one visit at that address. The grid is {scale.miles}{' '}
        {scale.miles === 1 ? 'mile' : 'miles'} a square and distances are
        straight-line, not road distance. There is no street layer, and no
        caregiver is tracked — the app holds addresses, not a device feed.
        {dropped > 0 && ` ${dropped} visit${dropped === 1 ? '' : 's'} could not be placed.`}
      </figcaption>
    </figure>
  )
}

/** The key, as text and shape rather than colour alone. */
export function MapLegend({
  visits,
  alerts,
}: {
  visits: LiveVisit[]
  alerts: LiveAlert[]
}) {
  const counts = new Map<PinGrade, number>()
  for (const v of visits) {
    const g = gradeOf(v, alerts)
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {(['critical', 'high', 'medium', 'clear'] as PinGrade[])
        .filter((g) => counts.has(g))
        .map((g) => (
          <li key={g} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className={cn(
                'size-3 shrink-0 rounded-full',
                gradeDot[g],
                g !== 'clear' && 'ring-2 ring-offset-1',
                g === 'critical' && 'ring-red-600',
                g === 'high' && 'ring-red-400',
                g === 'medium' && 'ring-amber-500',
              )}
            />
            <span className="text-ink-muted">{pinGradeLabels[g]}</span>
            <span className="text-ink font-semibold tabular-nums">
              {counts.get(g)}
            </span>
          </li>
        ))}
      <li className="flex items-center gap-1.5 text-xs">
        <span
          aria-hidden="true"
          className="bg-ink-subtle size-3 shrink-0 rounded-[3px]"
        />
        <span className="text-ink-muted">Branch office</span>
      </li>
    </ul>
  )
}
