import { useState, useEffect, useRef } from 'react';
import styles from './Dashboard.module.css';

interface DateFilterProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function DateFilter({ from, to, onChange }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasFilter = !!(from || to);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const today = new Date().toISOString().split('T')[0];
  const presets: Array<{ label: string; from: string; to: string }> = [
    { label: 'Hoje', from: today, to: today },
    { label: '7 dias', from: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], to: today },
    { label: '30 dias', from: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], to: today },
    { label: '90 dias', from: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0], to: today },
  ];

  const activePreset = presets.find((p) => p.from === from && p.to === to);

  const label = hasFilter
    ? activePreset
      ? activePreset.label
      : `${from ? new Date(from + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '...'} — ${to ? new Date(to + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '...'}`
    : 'Período';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`${styles.pill} ${hasFilter ? styles.active : ''}`}
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        {label}
        {hasFilter && (
          <span
            style={{ marginLeft: 2, cursor: 'pointer', opacity: 0.7, fontSize: '0.7rem' }}
            onClick={(e) => { e.stopPropagation(); onChange('', ''); }}
          >✕</span>
        )}
        {!hasFilter && <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>▼</span>}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
          background: 'var(--bg-surface)', border: 'var(--surface-border) solid var(--border)',
          borderRadius: 'var(--surface-radius)', boxShadow: 'var(--shadow-lg)',
          padding: '12px', minWidth: 220, animation: 'fadeIn 0.15s var(--ease-out)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {presets.map((p) => (
              <button
                key={p.label}
                className={styles.pill}
                style={{
                  fontSize: '0.68rem', padding: '4px 10px',
                  ...(activePreset?.label === p.label ? { background: 'var(--accent)', color: 'var(--text-on-accent)', borderColor: 'var(--accent)' } : {}),
                }}
                onClick={() => { onChange(p.from, p.to); setOpen(false); }}
              >{p.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => onChange(e.target.value, to)}
              style={{
                flex: 1, padding: '5px 8px', fontSize: 'var(--fs-xs)',
                border: 'var(--surface-border) solid var(--border)', borderRadius: 'var(--r-xs)',
                background: 'var(--bg-input)', color: 'var(--text)', fontFamily: 'var(--font)',
              }}
            />
            <span style={{ color: 'var(--text-tri)', fontSize: 'var(--fs-xs)' }}>—</span>
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => onChange(from, e.target.value)}
              style={{
                flex: 1, padding: '5px 8px', fontSize: 'var(--fs-xs)',
                border: 'var(--surface-border) solid var(--border)', borderRadius: 'var(--r-xs)',
                background: 'var(--bg-input)', color: 'var(--text)', fontFamily: 'var(--font)',
              }}
            />
          </div>
          {hasFilter && (
            <button
              style={{
                marginTop: 8, width: '100%', padding: '4px', fontSize: 'var(--fs-xs)',
                color: 'var(--text-tri)', background: 'transparent', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font)',
              }}
              onClick={() => { onChange('', ''); setOpen(false); }}
            >Limpar filtro</button>
          )}
        </div>
      )}
    </div>
  );
}
