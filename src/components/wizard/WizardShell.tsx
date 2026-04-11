import { useWizardStore } from '@/stores/wizard';
import { useUIStore } from '@/stores/ui';
import { WizardSidebar } from './WizardSidebar';
import { StepTags } from './steps/StepTags';
import { StepSurveys } from './steps/StepSurveys';
import { StepAssets } from './steps/StepAssets';
import { StepDsps } from './steps/StepDsps';
import { StepConfig } from './steps/StepConfig';
import { StepActivate } from './steps/StepActivate';
import styles from './WizardShell.module.css';

const STEP_MAP: Record<string, React.ComponentType> = {
  tags: StepTags,
  surveys: StepSurveys,
  assets: StepAssets,
  dsps: StepDsps,
  config: StepConfig,
  activate: StepActivate,
};

export function WizardShell() {
  const config = useWizardStore((s) => s.getStepConfig());
  const currentStep = useWizardStore((s) => s.currentStep);
  const activating = useWizardStore((s) => s.activating);
  const hasWizardData = useWizardStore((s) => s.hasContent() || s.hasDsp());
  const resetWizard = useWizardStore((s) => s.resetWizard);
  const setView = useUIStore((s) => s.setView);
  const toast = useUIStore((s) => s.toast);

  const activeStepKey = config.steps[currentStep];
  const StepComponent = STEP_MAP[activeStepKey];

  const handleExit = () => {
    if (activating) {
      toast('Aguarde a ativação terminar', 'error');
      return;
    }
    if (hasWizardData && !confirm('Você tem dados configurados. Sair vai descartar tudo. Continuar?')) {
      return;
    }
    resetWizard();
    setView('home');
  };

  return (
    <div className={styles.wizard}>
      <WizardSidebar onExit={handleExit} />
      <div className={styles.content}>
        <div className={styles.contentBg} />
        {StepComponent && (
          <div className={styles.stepView} key={activeStepKey}>
            <StepComponent />
          </div>
        )}
      </div>
    </div>
  );
}
