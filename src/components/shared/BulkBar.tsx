import { useState, useEffect } from 'react';
import styles from './BulkBar.module.css';

interface BulkBarAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface BulkBarProps {
  count: number;
  actions: BulkBarAction[];
  onCancel?: () => void;
}

export function BulkBar({ count, actions, onCancel }: BulkBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setVisible(true);
    } else {
      // Delay hide for exit animation
      const t = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(t);
    }
  }, [count]);

  if (!visible) return null;

  return (
    <div className={`${styles.bar} ${count > 0 ? styles.visible : ''}`}>
      <span className={styles.count}>{count} selecionado(s)</span>
      {actions.map((action) => (
        <button
          key={action.label}
          className={`${styles.btn} ${action.danger ? styles.danger : ''}`}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
      {onCancel && (
        <button className={styles.cancel} onClick={onCancel}>
          Cancelar
        </button>
      )}
    </div>
  );
}
