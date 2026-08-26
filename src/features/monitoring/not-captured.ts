import { CHECK_IN_RADIUS_METRES } from './locations-data'

/** What a coordinator would need a device for, named rather than faked. */
export const notCaptured: { id: string; label: string; needs: string }[] = [
  {
    id: 'position',
    label: 'Where the caregiver was at check-in',
    needs: 'a position from their phone at the moment of check-in',
  },
  {
    id: 'geofence',
    label: 'Whether the check-in was inside the boundary',
    needs: `that position, compared against the ${CHECK_IN_RADIUS_METRES} m policy radius`,
  },
  {
    id: 'ping',
    label: 'Where the caregiver is now',
    needs: 'a background location feed while the visit runs',
  },
  {
    id: 'checkout',
    label: 'A confirmed checkout',
    needs: 'a closing action in an app — a tap, a photo or a signature',
  },
]
