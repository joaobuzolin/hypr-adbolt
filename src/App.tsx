import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoginScreen } from '@/components/LoginScreen';
import { Topbar } from '@/components/layout/Topbar';
import { Toast } from '@/components/layout/Toast';
import { FlowSelector } from '@/components/FlowSelector';
import { WizardShell } from '@/components/wizard/WizardShell';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { CreativePreviewModal } from '@/components/shared/CreativePreview';

export function App() {

  // DEBUG: bypass auth for /debug-modal route — used for isolated preview testing
  if (typeof window !== 'undefined' && window.location.pathname === '/debug-modal') {
    const colgateTag = `<script src="https://www.googletagservices.com/dcm/dcmads.js"></script><ins class='dcmads' style='display:inline-block;width:300px;height:600px' data-dcm-placement='N1433191.4242296HYPRN/B35590397.444842268' data-dcm-rendering-mode='iframe' data-dcm-https-only data-dcm-gdpr-applies='gdpr=\${GDPR}' data-dcm-gdpr-consent='\${GDPR_CONSENT_755}' data-dcm-addtl-consent='\${ADDTL_CONSENT}' data-dcm-ltd='false' data-dcm-resettable-device-id='\${GOOGLE_RDID}' data-dcm-app-id='\${APP_ID_EXCL_APS}'><img src="https://ad.doubleclick.net/ddm/ad/N1433191.4242296HYPRN/B35590397.444842268;sz=300x600;ord=\${RANDOM_NUMBER};dc_lat=;dc_rdid=;tag_for_child_directed_treatment=;tfua=;gdpr=\${GDPR};gdpr_consent=\${GDPR_CONSENT_755};addtl_consent=\${ADDTL_CONSENT};ltd=;dc_tdv=1?" border="0" alt=""></ins>`;
    return (
      <CreativePreviewModal
        data={{
          name: 'DEBUG_COLGATE_300x600',
          dimensions: '300x600',
          type: '3p-tag',
          tagContent: colgateTag,
          vastTagUrl: undefined,
          thumbUrl: undefined,
        }}
        onClose={() => { window.location.href = '/'; }}
      />
    );
  }

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
          {currentView === 'home' && <FlowSelector />}
          {currentView === 'wizard' && <WizardShell />}
          {currentView === 'dashboard' && <Dashboard />}
        </ErrorBoundary>
      </div>

      <Toast />
    </div>
  );
}
