import styles from './ProgressBar.module.css';

interface DspProgress {
  dsp: string;
  label: string;
  current: number;
  total: number;
  message: string;
  status: 'loading' | 'done' | 'error';
}

interface ActivationProgressProps {
  dsps: DspProgress[];
}

export function ActivationProgress({ dsps }: ActivationProgressProps) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Ativando criativos...</h3>
      {dsps.map((d) => {
        const pct = d.total > 0 ? Math.round((d.current / d.total) * 100) : 0;
        const barClass = [
          styles.barFill,
          d.status === 'done' && styles.done,
          d.status === 'error' && styles.error,
        ].filter(Boolean).join(' ');

        return (
          <div key={d.dsp} className={styles.dsp}>
            <div className={styles.header}>
              <span className={styles.name}>{d.label}</span>
              <span className={styles.count}>{d.current}/{d.total}</span>
            </div>
            <div className={styles.barBg}>
              <div className={barClass} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.current}>{d.message}</div>
          </div>
        );
      })}
    </div>
  );
}
