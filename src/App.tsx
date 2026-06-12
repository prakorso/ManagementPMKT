import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { useData } from '@/context/DataContext';
import { useSession } from '@/context/SessionContext';
import { rolesFor } from '@/auth/roles';
import type { Role } from '@/types';

// Route-level code splitting keeps chart-heavy pages out of the initial bundle.
const Homepage = lazy(() => import('@/pages/Homepage').then((m) => ({ default: m.Homepage })));
const MemberOverview = lazy(() => import('@/pages/MemberOverview').then((m) => ({ default: m.MemberOverview })));
const TeamManagement = lazy(() => import('@/pages/TeamManagement').then((m) => ({ default: m.TeamManagement })));
const MemberDetail = lazy(() => import('@/pages/MemberDetail').then((m) => ({ default: m.MemberDetail })));
const ObjectiveTracker = lazy(() => import('@/pages/ObjectiveTracker').then((m) => ({ default: m.ObjectiveTracker })));
const PerformanceReporting = lazy(() =>
  import('@/pages/PerformanceReporting').then((m) => ({ default: m.PerformanceReporting })),
);
const ProjectAssignment = lazy(() => import('@/pages/ProjectAssignment').then((m) => ({ default: m.ProjectAssignment })));
const AssessmentTracker = lazy(() => import('@/pages/AssessmentTracker').then((m) => ({ default: m.AssessmentTracker })));
const MeetingNotes = lazy(() => import('@/pages/MeetingNotes').then((m) => ({ default: m.MeetingNotes })));
const ManagerReadiness = lazy(() => import('@/pages/ManagerReadiness').then((m) => ({ default: m.ManagerReadiness })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));

/** Role guard + Suspense wrapper for a protected route. */
function Guard({ path, children }: { path: string; children: ReactNode }) {
  const { session } = useSession();
  const role: Role = session?.role ?? 'member';
  if (!rolesFor(path).includes(role)) return <Navigate to="/" replace />;
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

export default function App() {
  const { loading, error, data } = useData();
  const { session } = useSession();

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorState message={error ?? 'No data available.'} />;
  if (!session) return <LoginScreen />;

  const isMember = session.role === 'member';

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={
              <Suspense fallback={<LoadingScreen />}>{isMember ? <MemberOverview /> : <Homepage />}</Suspense>
            }
          />
          <Route path="performance" element={<Guard path="/performance"><PerformanceReporting /></Guard>} />
          <Route path="objectives" element={<Guard path="/objectives"><ObjectiveTracker /></Guard>} />
          <Route path="team" element={<Guard path="/team"><TeamManagement /></Guard>} />
          <Route path="team/:memberId" element={<Guard path="/team"><MemberDetail /></Guard>} />
          <Route path="projects" element={<Guard path="/projects"><ProjectAssignment /></Guard>} />
          <Route path="notes" element={<Guard path="/notes"><MeetingNotes /></Guard>} />
          <Route path="assessments" element={<Guard path="/assessments"><AssessmentTracker /></Guard>} />
          <Route path="readiness" element={<Guard path="/readiness"><ManagerReadiness /></Guard>} />
          <Route path="settings" element={<Guard path="/settings"><Settings /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
