# Homecare Admin

Admin console for a home care agency — clients, caregivers, scheduling and visit records.

## Stack

| Layer | Choice |
| --- | --- |
| Build | Vite 8 |
| UI | React 19 + TypeScript 5.9 (strict) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first `@theme`) |
| Routing | React Router 7 (data router) |
| Icons | lucide-react |
| Lint | ESLint 9 flat config + typescript-eslint |

## Getting started

Requires **Node ^20.19.0 || >=22.12.0** (Vite's engine floor — older Node fails at
startup with `node:util does not provide an export named 'styleText'`). Use `nvm use`
to pick up `.nvmrc`.

```bash
nvm use          # Node 22
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm run typecheck`.

## Structure

```
src/
  app/router.tsx              route table
  types.ts                    shared domain unions (Tone, Priority, statuses)
  components/layout/          AdminLayout, Sidebar, Topbar, Logo, nav config
  components/ui/              Avatar, SectionHeading, StatusBadge, Pagination
  features/dashboard/         data.ts + one component per dashboard section
  features/care-recipients/   directory + profile/ (header, tabs, Overview)
  pages/                      one file per route
  lib/                        cn, tone maps, useMediaQuery
  index.css                   Tailwind entry + design tokens
```

Each feature owns a `data.ts` holding typed mock data. Swap those for API
calls and the components don't change.

`@/` is aliased to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

## Design tokens

Defined in `src/index.css` under `@theme`, so they generate real utilities:

- `brand-50` … `brand-900` — CareProfs indigo
- `surface`, `canvas`, `sunken`, `line`
- `ink`, `ink-muted`, `ink-subtle` — all three pass WCAG AA on `surface`
- `spacing-sidebar` — drives both `w-sidebar` and `lg:pl-sidebar`

Per-status colours (emerald / blue / amber / red / slate) live in `src/lib/tone.ts`
as full class strings, since Tailwind can't see dynamically built class names.

## Responsive behaviour

| Width | Layout |
| --- | --- |
| < 420px | Single column throughout; sidebar is a modal drawer |
| 420–767px | Stat and metric cards go 2-up; schedule renders as stacked cards |
| 768–1023px | Schedule becomes a scrollable table; drawer still modal |
| 1024px+ | Sidebar becomes permanent; stats 3-up |
| 1280px+ | Stats 6-up, metrics 5-up, timeline and quick actions side by side |

Interactive targets are ≥44px below `lg` and tighten on pointer-based widths.
The drawer traps focus, closes on Escape, is `inert` when hidden, and auto-closes
if the viewport grows past `lg`.

## Routes

```
/dashboard
/care-recipients                     directory
/care-recipients/:id                 → redirects to /overview
/care-recipients/:id/overview        built
/care-recipients/:id/care-plan       built
/care-recipients/:id/visits          built
/care-recipients/:id/medications     built
/care-recipients/:id/health          built
/care-recipients/:id/caregivers      built
/care-recipients/:id/documents       built
/care-recipients/:id/billing         built
/care-recipients/:id/notes           built
/care-recipients/:id/family          built
/care-recipients/:id/activity        built
/care-recipients/:id/discharge       archive / discharge workflow
```

The discharge screen is a sibling of the tabs, not one of them — it replaces the
tabbed view rather than living inside it. Reached from the `⋯` menu on any
directory row.

Every route past the dashboard is code-split. `lazyRoute()` names the export
explicitly rather than taking the first value of the module namespace: those
keys come out in sorted order, not declaration order, so adding an export that
sorts earlier would silently render the wrong screen.

The profile tab lives in the URL, so tabs are `NavLink`s in a nav landmark
rather than an ARIA tablist. Unknown ids render an in-page not-found; unknown
tab slugs fall through to the global 404. Header buttons change per tab via
`actionsForTab()` in `profile/tabs.ts`.

## Not wired up yet

Data fetching, auth, and forms. Every nav route resolves and all eleven profile
tabs are built. Only `cr-001` has authored clinical data; the rest either show
an empty state or synthesise a minimal record, chosen per tab so no tab
contradicts another.

## The Activity tab is the consistency check

`activity-data.ts` authors nothing. `buildActivity()` assembles the audit trail
from all nine other modules — visit clock-ins, care notes, doses, health events,
document uploads, invoices and payments, care plan revisions, caregiver
assignments and family contact. Every row already exists somewhere else in the
record, so the tab can't drift from what it audits.

That also means the trail deliberately shows one real-world event more than
once. A fall produces a health event, a care note and an uploaded report — three
distinct system actions with different actors and timestamps. Each row carries a
source chip so they read as three views of one occurrence rather than three
incidents.

Modules that render a date label store the ISO date beside it (`dateIso` next to
`date`) rather than making consumers re-parse the label — `new Date('Jul 20,
2026')` is outside the ECMAScript-specified formats, and a silent parse failure
would have dropped whole sources from the trail.

`discharge-data.ts` applies the same rule to a destructive action: the service
summary and every checklist row are answered by the module that owns the fact,
so Process Discharge is blocked by a real ₦1,200 balance, a real open care plan
and five still-attached caregivers — not by a hardcoded warning icon. A
temporary hold preserves the plan and the roster by design, so those rows change
their wording rather than showing a green tick over contradicting text.

## Sample data rules

"Today" for the sample is **2026-07-24**. `RANGE_ANCHOR` in `VisitsTab.tsx` pins
date filtering to that rather than the wall clock, and the Medications tab
schedules against the same day.

The visit log deliberately spans further back than 30 days so the date-range
filter has something to exclude.

The Overview tab holds no copy of recent visits, medications or the care team —
`getRecipientProfile()` derives all three from `visits-data.ts`,
`medications-data.ts` and `caregivers-data.ts`. Duplicating them is how they
drifted into contradiction (a dose logged at 08:00 by a caregiver who clocked in
at 08:58).

Numbers that describe other data are computed, never written down beside it:
`calculateCoverage()` and `totalHours()` in `caregivers-data.ts` derive the
coverage rate, which days are unassigned, and the monthly hour total. The
original design asserted "100% — perfect score" directly above two visibly empty
Sunday blocks.

Same rule in `documents-data.ts`: totals, category counts, "last upload" and the
recent-activity list are all counted from the document array. A document's
expiry status comes from `effectiveStatus()` comparing `expiresAt` against
`TODAY`, so an "Expiring Soon" chip always has a date behind it — the review
state (`current` / `pending` / `verified`) is the only part a human sets.

`billing-data.ts` goes furthest: an invoice stores only its visit count, and
every money figure is computed from `RATE_PER_VISIT` and the policy's
`coverageRate` — amount, insurance share, patient share, outstanding balance,
month-over-month delta, payment history and invoice status. Nothing on the tab
can disagree with anything else because nothing is written down twice.

Billing is also the reconciliation anchor for visit counts: 125 invoiced visits
plus the six logged since the last billing period is why `totalVisits` is 133.

The shift grid is reconciled against the visit log: every visit in
`visits-data.ts` falls inside the block its caregiver holds. Care notes are
reconciled the same way — each note's author holds that day's shift block, with
the coordinator and family exempt.

`roleFor()` in `caregivers-data.ts` is the single source for how a person is
titled. Notes, health events and documents all name the same people, and were
describing them three different ways (Sarah Williams was simultaneously "CNA",
"Caregiver" and "Primary Caregiver").

Care Recipients paginates against the rows actually in hand, not the 342 server
count — the count only supplies the "of N" in the summary line, so the table and
the summary can't contradict each other once real paging lands.
