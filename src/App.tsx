import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Route-level code splitting keeps the chart-heavy pages (and recharts) out of
// the initial bundle — the overview loads fast and chart code arrives on demand.
const Homepage = lazy(() => import('@/pages/Homepage').then((m) => ({ default: m.Homepage })));
const TeamManagement = lazy(() => import('@/pages/TeamManagement').then((m) => ({ default: m.TeamManagement })));
const MemberDetail = lazy(() => import('@/pages/MemberDetail').then((m) => ({ default: m.MemberDetail })));
const ObjectiveTracker = lazy(() => import('@/pages/ObjectiveTracker').then((m) => ({ default: m.ObjectiveTracker })));
const PerformanceReporting = lazy(() =>
  import('@/pages/PerformanceReporting').then((m) => ({ default: m.PerformanceReporting })),
);
const AssessmentTracker = lazy(() => import('@/pages/AssessmentTracker').then((m) => ({ default: m.AssessmentTracker })));
const MeetingNotes = lazy(() => import('@/pages/MeetingNotes').then((m) => ({ default: m.MeetingNotes })));
const ManagerReadiness = lazy(() => import('@/pages/ManagerReadiness').then((m) => ({ default: m.ManagerReadiness })));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={
              <Suspense fallback={<LoadingScreen />}>
                <Homepage />
              </Suspense>
            }
          />
          <Route
            path="team"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <TeamManagement />
              </Suspense>
            }
          />
          <Route
            path="team/:memberId"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <MemberDetail />
              </Suspense>
            }
          />
          <Route
            path="objectives"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <ObjectiveTracker />
              </Suspense>
            }
          />
          <Route
            path="performance"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <PerformanceReporting />
              </Suspense>
            }
          />
          <Route
            path="assessments"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <AssessmentTracker />
              </Suspense>
            }
          />
          <Route
            path="notes"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <MeetingNotes />
              </Suspense>
            }
          />
          <Route
            path="readiness"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <ManagerReadiness />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
