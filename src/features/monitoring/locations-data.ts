/**
 * Where everybody is.
 *
 * The rest of the fixture carries street addresses but no coordinates, which is
 * why the Assign screen refuses to rank on distance and Schedule Settings marks
 * the travel limit "recorded only". This module supplies the missing half — a
 * point per address — so a map plots real relative positions rather than
 * decorative pins.
 *
 * What it deliberately does NOT supply is a caregiver's *live* position. A home
 * address is a fixed fact; a moving dot needs a device feed this app has no
 * trace of, and drawing one would be the fabrication the map is meant to avoid.
 */
export interface Point {
  lat: number
  lng: number
}

/** Springfield, Illinois — the town every address in the fixture sits in. */
export const CITY_CENTRE: Point = { lat: 39.7817, lng: -89.6501 }

export interface Place extends Point {
  /** The postal address, so the map and the care record agree. */
  address: string
}

/*
 * Recipients. Addresses follow the one already on Margaret Johnson's record
 * (234 Maple Drive) and are spread across the three branch catchments.
 */
export const recipientPlaces: Record<string, Place> = {
  'cr-001': {
    address: '234 Maple Drive, Springfield, IL 62701',
    lat: 39.7952,
    lng: -89.6438,
  },
  'cr-002': {
    address: '77 Ashland Court, Springfield, IL 62703',
    lat: 39.7623,
    lng: -89.6249,
  },
  'cr-003': {
    address: '512 Governor Street, Springfield, IL 62704',
    lat: 39.7788,
    lng: -89.6712,
  },
  'cr-004': {
    address: '19 Rutledge Way, Springfield, IL 62702',
    lat: 39.8134,
    lng: -89.6605,
  },
  'cr-005': {
    address: '306 Lowell Avenue, Springfield, IL 62704',
    lat: 39.7701,
    lng: -89.6884,
  },
  'cr-006': {
    address: '88 Bellefontaine Road, Springfield, IL 62702',
    lat: 39.8241,
    lng: -89.6392,
  },
  'cr-007': {
    address: '145 Wiggins Avenue, Springfield, IL 62704',
    lat: 39.7566,
    lng: -89.6693,
  },
  'cr-008': {
    address: '61 Cherry Hills Road, Springfield, IL 62703',
    lat: 39.7449,
    lng: -89.6118,
  },
}

/** The three offices on the roster. */
export const branchPlaces: Record<string, Place> = {
  'North Branch': {
    address: '900 North Grand Avenue East, Springfield, IL 62702',
    lat: 39.8123,
    lng: -89.6404,
  },
  'Central Branch': {
    address: '210 South Sixth Street, Springfield, IL 62701',
    lat: 39.7994,
    lng: -89.6493,
  },
  'South Branch': {
    address: '2500 Chatham Road, Springfield, IL 62704',
    lat: 39.7538,
    lng: -89.6741,
  },
}

/** Caregivers' home addresses, taken from the street address on the roster. */
export const staffPlaces: Record<string, Point> = {
  'cg-001': { lat: 39.8067, lng: -89.6351 }, // 18 Cedar Lane
  'cg-002': { lat: 39.8189, lng: -89.6519 }, // 7 Birchwood Court
  'cg-003': { lat: 39.7873, lng: -89.6802 }, // 52 Windermere Road
  'cg-004': { lat: 39.7492, lng: -89.6607 }, // 11 Larkspur Avenue
  'cg-005': { lat: 39.7614, lng: -89.6928 }, // 96 Alder Street
  'cg-006': { lat: 39.8055, lng: -89.6612 }, // 3 Ridgeway Close
  'cg-007': { lat: 39.8098, lng: -89.6288 }, // 40 Prospect Hill
  'cg-008': { lat: 39.7936, lng: -89.6577 }, // 14 Chancery Gate
  'cg-009': { lat: 39.7481, lng: -89.6835 }, // 61 Foxglove Way
}

export function placeOfRecipient(id: string): Place | undefined {
  return recipientPlaces[id]
}

/**
 * The radius an agency would treat as "at the address".
 *
 * A policy number, not a measurement: nothing in this app captures where a
 * caregiver's device is, so no check-in is ever tested against it. It is here
 * so the boundary can be drawn to scale rather than sketched.
 */
export const CHECK_IN_RADIUS_METRES = 150

/* -------------------------------- distance --------------------------------- */

const EARTH_MILES = 3958.8
const rad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle miles between two points. */
export function distanceMiles(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatMiles(miles: number): string {
  return miles < 0.1 ? 'under 0.1 miles' : `${miles.toFixed(1)} miles`
}

/** How far a client is from a given branch office. */
export function branchDistanceMiles(
  branch: string | null,
  recipientId: string,
): number | null {
  const from = branch ? branchPlaces[branch] : undefined
  const to = recipientPlaces[recipientId]
  if (!from || !to) return null
  return distanceMiles(from, to)
}

/** How far a caregiver's home is from a client's. Null if either is missing. */
export function travelMiles(
  caregiverId: string | null,
  recipientId: string,
): number | null {
  const from = caregiverId ? staffPlaces[caregiverId] : undefined
  const to = recipientPlaces[recipientId]
  if (!from || !to) return null
  return distanceMiles(from, to)
}

/* ------------------------------- projection -------------------------------- */

export interface Bounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/** Everything the map has to fit, with a margin. */
export function boundsOf(points: Point[], pad = 0.1): Bounds {
  if (points.length === 0) {
    return {
      minLat: CITY_CENTRE.lat - 0.05,
      maxLat: CITY_CENTRE.lat + 0.05,
      minLng: CITY_CENTRE.lng - 0.05,
      maxLng: CITY_CENTRE.lng + 0.05,
    }
  }
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  // A single point has no extent; give it one so the projection cannot divide
  // by zero.
  const latPad = Math.max((maxLat - minLat) * pad, 0.004)
  const lngPad = Math.max((maxLng - minLng) * pad, 0.005)
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  }
}

export interface Projection {
  /** SVG user units. */
  width: number
  height: number
  project: (point: Point) => { x: number; y: number }
  /** Miles per SVG unit on the horizontal axis, for the scale bar. */
  milesPerUnit: number
}

/**
 * Equirectangular, with longitude squeezed by cos(latitude) so a mile east and
 * a mile north are the same length on screen. Without the correction, at 39.8°N
 * the map would stretch east–west by about 30%.
 */
export function projectionFor(bounds: Bounds, width = 800): Projection {
  const midLat = (bounds.minLat + bounds.maxLat) / 2
  const squeeze = Math.cos(rad(midLat))

  const spanLng = (bounds.maxLng - bounds.minLng) * squeeze
  const spanLat = bounds.maxLat - bounds.minLat
  // Rounded for a tidy viewBox. The residual is under half a unit, which at
  // 800 units wide is a scale error below 0.1% — the grid stays square to the
  // precision the caption claims.
  const height = Math.round((width * spanLat) / spanLng)

  const milesWide = distanceMiles(
    { lat: midLat, lng: bounds.minLng },
    { lat: midLat, lng: bounds.maxLng },
  )

  return {
    width,
    height,
    milesPerUnit: milesWide / width,
    project: (point) => ({
      x: ((point.lng - bounds.minLng) * squeeze * width) / spanLng,
      // SVG y grows downward; north is up.
      y: ((bounds.maxLat - point.lat) * height) / spanLat,
    }),
  }
}

/* --------------------------------- coverage -------------------------------- */

/**
 * Widen the short axis until the box matches `ratio`, so the map fills its slot
 * instead of leaving a column of blank either side. Only ever grows the window;
 * nothing is cropped.
 */
export function fitAspect(bounds: Bounds, ratio: number): Bounds {
  const midLat = (bounds.minLat + bounds.maxLat) / 2
  const squeeze = Math.cos(rad(midLat))
  const spanLat = bounds.maxLat - bounds.minLat
  const spanLng = (bounds.maxLng - bounds.minLng) * squeeze
  const current = spanLng / spanLat

  if (current < ratio) {
    const grow = (spanLat * ratio - spanLng) / squeeze / 2
    return { ...bounds, minLng: bounds.minLng - grow, maxLng: bounds.maxLng + grow }
  }
  const grow = (spanLng / ratio - spanLat) / 2
  return { ...bounds, minLat: bounds.minLat - grow, maxLat: bounds.maxLat + grow }
}
