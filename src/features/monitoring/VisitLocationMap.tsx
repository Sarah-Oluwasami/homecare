import { useId } from 'react'
import {
  CHECK_IN_RADIUS_METRES,
  formatMiles,
  placeOfRecipient,
  travelMiles,
} from './locations-data'
import type { BoardVisit } from '@/features/scheduling/board-data'
import { notCaptured } from './not-captured'

/**
 * The visit's address and the check-in boundary around it, drawn to scale.
 *
 * The boundary is a *policy* — the radius an agency would treat as "at the
 * address" — not a measurement. Nothing here is a caregiver's position: the app
 * captures no device location, so there is no dot to place and no offset to
 * report. The source design drew a live "broadcast GPS position" with a 45m
 * variance and a ping received 30 seconds ago; none of those values exist.
 */
export function VisitLocationMap({ visit }: { visit: BoardVisit }) {
  const clipId = useId()
  const place = placeOfRecipient(visit.recipientId)

  if (!place)
    return (
      <p className="text-ink-subtle text-sm" role="status">
        No address on file for {visit.recipientName}.
      </p>
    )

  // Frame: the boundary, with room around it. Metres per SVG unit is fixed so
  // the ring and the scale bar cannot disagree.
  const size = 320
  const metresWide = CHECK_IN_RADIUS_METRES * 4
  const perUnit = metresWide / size
  const centre = size / 2
  const ring = CHECK_IN_RADIUS_METRES / perUnit

  // Distance only, never a marker: at 150 m across, the nearest caregiver home
  // in the fixture (0.5 miles) is ten frames away, so a dot would always be
  // drawn at the edge and read as a position.
  const homeMiles = travelMiles(visit.caregiverId, visit.recipientId)

  const scaleMetres = 100
  const scaleUnits = scaleMetres / perUnit

  return (
    <figure className="m-0">
      <div className="border-line bg-sunken/50 overflow-hidden rounded-xl border">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${visit.recipientName}'s address with a policy radius of ${CHECK_IN_RADIUS_METRES} metres around it — the distance an agency would treat as "at the address". This app captures no device position, so there is no caregiver position to plot.`}
          className="block h-auto w-full"
        >
          <defs>
            <clipPath id={clipId}>
              <rect width={size} height={size} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {/* The boundary, dashed: it is a rule, not an observation. */}
            <circle
              cx={centre}
              cy={centre}
              r={ring}
              className="fill-brand-50 stroke-brand-400"
              strokeWidth={2}
              strokeDasharray="6 5"
            />
            <circle cx={centre} cy={centre} r={7} className="fill-brand-600" />
            <text
              x={centre}
              y={centre - 14}
              textAnchor="middle"
              fontSize={15}
              className="fill-ink font-semibold"
            >
              {visit.recipientName}
            </text>
            <text
              x={centre}
              y={centre + ring + 16}
              textAnchor="middle"
              fontSize={14}
              className="fill-brand-700"
            >
              {CHECK_IN_RADIUS_METRES} m policy radius
            </text>
          </g>

          <g transform={`translate(16 ${size - 16})`}>
            <line
              x1={0}
              y1={0}
              x2={scaleUnits}
              y2={0}
              className="stroke-ink-muted"
              strokeWidth={2}
            />
            <line x1={0} y1={-4} x2={0} y2={4} className="stroke-ink-muted" strokeWidth={2} />
            <line
              x1={scaleUnits}
              y1={-4}
              x2={scaleUnits}
              y2={4}
              className="stroke-ink-muted"
              strokeWidth={2}
            />
            <text x={0} y={-7} fontSize={14} className="fill-ink-muted">
              {scaleMetres} m
            </text>
          </g>
        </svg>
      </div>

      <figcaption className="text-ink-subtle mt-2 text-xs">
        The dot is {visit.recipientName}&rsquo;s address; the dashed ring is a
        policy radius of {CHECK_IN_RADIUS_METRES} m, not a measurement. No
        position is plotted inside it — this app captures no device location, so
        no check-in has ever been tested against it.
        {homeMiles !== null &&
          ` ${visit.caregiverName}'s home is ${formatMiles(homeMiles)} away, far outside this frame.`}
      </figcaption>
    </figure>
  )
}

export function NotCapturedList() {
  return (
    <ul className="divide-line divide-y">
      {notCaptured.map((item) => (
        <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
          <p className="text-ink text-sm break-words">{item.label}</p>
          <p className="text-ink-subtle mt-0.5 text-xs break-words">
            Would need {item.needs}.
          </p>
        </li>
      ))}
    </ul>
  )
}
