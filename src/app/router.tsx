import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RouteFallback } from '@/components/layout/RouteFallback'
import { RouteError } from '@/components/layout/RouteError'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

/*
 * Everything past the dashboard is route-split. The eleven profile tabs each
 * pull in their own data module, and bundling them together pushed the entry
 * chunk past 500 kB even though a visitor only ever opens one at a time.
 *
 * The export is named explicitly rather than taken as the first value of the
 * namespace: module keys come out in sorted order, not declaration order, so
 * adding an export that sorts earlier would silently render the wrong screen.
 */
const lazyRoute =
  <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  async () => ({ Component: (await load())[name] })

/** Routes still awaiting a real screen. Keeps the nav fully clickable. */
const stubs: { path: string; title: string; description: string }[] = [
  {
    path: 'messages',
    title: 'Messages',
    description: 'Conversations with caregivers, families and clients.',
  },
  {
    path: 'reports',
    title: 'Reports',
    description: 'Operational and compliance reporting.',
  },
  {
    path: 'settings',
    title: 'Settings',
    description: 'Organisation details, roles and preferences.',
  },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    // Without this the shell renders null while a lazy chunk loads, so a cold
    // deep link is a blank page rather than a skeleton.
    HydrateFallback: RouteFallback,
    children: [
      {
        // Pathless, so the boundary sits below the layout: a route that throws
        // is replaced, the navigation around it is not.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          /*
           * Plans & Billing is a section, not a page: an overview, the plan
           * catalogue and the subscription workspace. The selected plan and the
           * selected subscription live in the URL rather than in component state,
           * because the overview drills straight into them — "Renew now" has to
           * land on one row's Renewals tab, and a bare table would lose it.
           *
           * Both use optional params on a single route rather than an index route
           * plus a nested one. Two route objects at different depths reconcile as
           * two different components, so selecting a row would unmount the page and
           * silently reset the filters the user had just typed.
           */
          {
            path: 'billing',
            lazy: lazyRoute(
              () => import('@/pages/PlansBillingPage'),
              'PlansBillingPage',
            ),
          },
          {
            path: 'billing/plans/:planId?/:tab?',
            lazy: lazyRoute(
              () => import('@/pages/CarePlansPage'),
              'CarePlansPage',
            ),
          },
          {
            path: 'billing/subscriptions/:subId?/:tab?',
            lazy: lazyRoute(
              () => import('@/pages/SubscriptionsPage'),
              'SubscriptionsPage',
            ),
          },
          /*
           * One row per contact, with the open account in the URL — the quick
           * preview is a real destination, so a colleague can be sent straight
           * to it.
           */
          /*
           * The roster and one caregiver's record are the same component: the
           * profile is the roster with a person open, and keeping them on one
           * route means returning to the list does not rebuild it.
           */
          /*
           * Declared before the tabbed route and with a static third segment,
           * so "edit" cannot be mistaken for a tab. It replaces the tabbed view
           * rather than living inside it — the same shape as discharge.
           */
          {
            path: 'caregivers/:caregiverId/edit',
            lazy: lazyRoute(
              () => import('@/pages/CaregiverEditPage'),
              'CaregiverEditPage',
            ),
          },
          {
            path: 'caregivers/:caregiverId?/:tab?',
            lazy: lazyRoute(() => import('@/pages/CaregiversPage'), 'CaregiversPage'),
          },
          {
            path: 'scheduling',
            lazy: lazyRoute(() => import('@/pages/SchedulingPage'), 'SchedulingPage'),
          },
          {
            path: 'live-monitoring',
            lazy: lazyRoute(
              () => import('@/pages/LiveMonitoringPage'),
              'LiveMonitoringPage',
            ),
          },
          {
            // A sibling route, not a nested one: the alerts page is a
            // different list with its own filters, not a tab inside the board.
            path: 'live-monitoring/alerts',
            lazy: lazyRoute(
              () => import('@/pages/AlertsIncidentsPage'),
              'AlertsIncidentsPage',
            ),
          },
          {
            path: 'live-monitoring/history',
            lazy: lazyRoute(
              () => import('@/pages/MonitoringHistoryPage'),
              'MonitoringHistoryPage',
            ),
          },
          {
            // Declared after the bare path so `/alerts` keeps matching the
            // register rather than falling into the detail screen.
            path: 'live-monitoring/alerts/:reference/:tab?',
            lazy: lazyRoute(
              () => import('@/pages/IncidentDetailsPage'),
              'IncidentDetailsPage',
            ),
          },
          {
            path: 'scheduling/settings',
            lazy: lazyRoute(
              () => import('@/pages/ScheduleSettingsPage'),
              'ScheduleSettingsPage',
            ),
          },
          {
            // The prefix with no id is not a page; without this it fell to the
            // global 404 rather than back to the board it came from.
            path: 'scheduling/visits',
            element: <Navigate to="/scheduling" replace />,
          },
          {
            // Static fourth segment, so it outranks the `:tab?` route below.
            path: 'scheduling/visits/:visitId/assign',
            lazy: lazyRoute(
              () => import('@/pages/AssignCaregiverPage'),
              'AssignCaregiverPage',
            ),
          },
          {
            // Static third segment, so it outranks nothing — `scheduling` has
            // no dynamic child to compete with, but keeping visits under their
            // own prefix leaves room for one.
            path: 'scheduling/visits/:visitId/:tab?',
            lazy: lazyRoute(
              () => import('@/pages/VisitDetailsPage'),
              'VisitDetailsPage',
            ),
          },
          {
            path: 'families/:accountId?',
            lazy: lazyRoute(() => import('@/pages/FamiliesPage'), 'FamiliesPage'),
          },
          {
            path: 'care-recipients',
            lazy: lazyRoute(
              () => import('@/pages/CareRecipientsPage'),
              'CareRecipientsPage',
            ),
          },
          /*
           * Intake, not a recipient. A static segment outranks the `:id`
           * sibling below in React Router's route ranking, so this cannot be
           * mistaken for a profile with the id "requests".
           */
          {
            path: 'care-recipients/requests/:requestId?',
            lazy: lazyRoute(
              () => import('@/pages/CareRequestsPage'),
              'CareRequestsPage',
            ),
          },
          // Sibling of the profile tabs, not one of them — it replaces the whole
          // tabbed view rather than living inside it.
          {
            path: 'care-recipients/:id/discharge',
            lazy: lazyRoute(
              () => import('@/pages/DischargePage'),
              'DischargePage',
            ),
          },
          {
            path: 'care-recipients/:id',
            lazy: lazyRoute(
              () => import('@/pages/RecipientProfilePage'),
              'RecipientProfilePage',
            ),
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              {
                path: 'overview',
                lazy: lazyRoute(
                  () =>
                    import('@/features/care-recipients/profile/OverviewTab'),
                  'OverviewTab',
                ),
              },
              {
                path: 'care-plan',
                lazy: lazyRoute(
                  () =>
                    import('@/features/care-recipients/profile/CarePlanTab'),
                  'CarePlanTab',
                ),
              },
              {
                path: 'visits',
                lazy: lazyRoute(
                  () => import('@/features/care-recipients/profile/VisitsTab'),
                  'VisitsTab',
                ),
              },
              {
                path: 'medications',
                lazy: lazyRoute(
                  () =>
                    import('@/features/care-recipients/profile/MedicationsTab'),
                  'MedicationsTab',
                ),
              },
              {
                path: 'health',
                lazy: lazyRoute(
                  () => import('@/features/care-recipients/profile/HealthTab'),
                  'HealthTab',
                ),
              },
              {
                path: 'caregivers',
                lazy: lazyRoute(
                  () =>
                    import('@/features/care-recipients/profile/CaregiversTab'),
                  'CaregiversTab',
                ),
              },
              {
                path: 'documents',
                lazy: lazyRoute(
                  () =>
                    import('@/features/care-recipients/profile/DocumentsTab'),
                  'DocumentsTab',
                ),
              },
              {
                path: 'billing',
                lazy: lazyRoute(
                  () => import('@/features/care-recipients/profile/BillingTab'),
                  'BillingTab',
                ),
              },
              {
                path: 'notes',
                lazy: lazyRoute(
                  () => import('@/features/care-recipients/profile/NotesTab'),
                  'NotesTab',
                ),
              },
              {
                path: 'family',
                lazy: lazyRoute(
                  () => import('@/features/care-recipients/profile/FamilyTab'),
                  'FamilyTab',
                ),
              },
              {
                path: 'activity',
                lazy: lazyRoute(
                  () =>
                    import('@/features/care-recipients/profile/ActivityTab'),
                  'ActivityTab',
                ),
              },
            ],
          },
          {
            path: 'tasks',
            lazy: lazyRoute(() => import('@/pages/TasksPage'), 'TasksPage'),
          },
          {
            path: 'tasks/templates',
            lazy: lazyRoute(
              () => import('@/pages/TaskTemplatesPage'),
              'TaskTemplatesPage',
            ),
          },
          {
            path: 'tasks/settings',
            lazy: lazyRoute(
              () => import('@/pages/TaskSettingsPage'),
              'TaskSettingsPage',
            ),
          },
          {
            path: 'tasks/:taskId',
            lazy: lazyRoute(
              () => import('@/pages/TaskDetailsPage'),
              'TaskDetailsPage',
            ),
          },
          ...stubs.map(({ path, title, description }) => ({
            path,
            element: (
              <PlaceholderPage title={title} description={description} />
            ),
          })),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
