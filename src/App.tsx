import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoginScreen } from '@/components/LoginScreen';
import { Topbar } from '@/components/layout/Topbar';
import { Toast } from '@/components/layout/Toast';

// Views are code-split so the initial bundle only ships what's needed
// for the current view. Named-exports are wrapped in `.then(...)` to match
// React.lazy's default-export contract without touching the components.
const FlowSelector = lazy(() =>
  import('@/components/FlowSelector').then((m) => ({ default: m.FlowSelector })),
);
const WizardShell = lazy(() =>
  import('@/components/wizard/WizardShell').then((m) => ({ default: m.WizardShell })),
);
const Dashboard = lazy(() =>
  import('@/components/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })),
);

export function App() {
  const { user, isLoading, initialize } = useAuthStore();
  const { currentView, theme } = useUIStore();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync theme attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Show nothing while checking session
  if (isLoading) {
    return null;
  }

  // Not logged in — show login screen
  if (!user) {
    return (
      <>
        <LoginScreen />
        <Toast />
      </>
    );
  }

  // Logged in — show app
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
      <Topbar />

      <div id="main-content">
        <ErrorBoundary>
          <Suspense fallback={null}>
            {currentView === 'home' && <FlowSelector />}
            {currentView === 'wizard' && <WizardShell />}
            {currentView === 'dashboard' && <Dashboard />}
          </Suspense>
        </ErrorBoundary>
      </div>

      <Toast />
    </div>
  );
}
