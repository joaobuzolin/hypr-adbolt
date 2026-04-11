import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSurveyList, detectVariant } from '@/services/typeform';
import type { TypeformSurvey } from '@/services/typeform';
import { SURVEY_SIZES } from '@/types';
import styles from './StepSurveys.module.css';

const SURVEY_TYPES = ['Awareness', 'Associação', 'Atitude', 'Favoritismo', 'Intenção', 'Preferência', 'Probabilidade'];

interface SurveyPickerProps {
  onAdd: (surveys: Array<{ formId: string; title: string; type: string; variant: string; size: string }>) => void;
}

export function SurveyPicker({ onAdd }: SurveyPickerProps) {
  const [surveys, setSurveys] = useState<TypeformSurvey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [size, setSize] = useState('300x600');
  const [openDD, setOpenDD] = useState<string | null>(null);
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Editable overrides for type and variant (keyed by form id)
  const [typeOverrides, setTypeOverrides] = useState<Record<string, string>>({});
  const [variantOverrides, setVariantOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    fetchSurveyList(50)
      .then(setSurveys)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenDD(null);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenDD(null); };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('click', handleClick); document.removeEventListener('keydown', handleKey); };
  }, []);

  const allTypes = [...SURVEY_TYPES, ...customTypes.filter((t) => !SURVEY_TYPES.includes(t))];
  const variantOptions = ['Controle', 'Exposto'];

  const getType = (s: TypeformSurvey) => typeOverrides[s.id] || s.type;
  const getVariant = (s: TypeformSurvey) => variantOverrides[s.id] || s.variant;

  const filtered = filter
    ? surveys.filter((s) => {
        const ft = filter.toLowerCase();
        return s.title.toLowerCase().includes(ft) || s.brand.toLowerCase().includes(ft) || getType(s).toLowerCase().includes(ft);
      })
    : surveys;

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    const ids = filtered.map((s) => s.id);
    const allSel = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => { if (allSel) next.delete(id); else next.add(id); });
    setSelected(next);
  };

  const handleAdd = () => {
    const items = surveys
      .filter((s) => selected.has(s.id))
      .map((s) => ({
        formId: s.id,
        title: s.title,
        type: getType(s),
        variant: getVariant(s),
        size,
      }));
    if (items.length) onAdd(items);
    setSelected(new Set());
  };

  const handleSetType = (surveyId: string, type: string) => {
    setTypeOverrides((prev) => ({ ...prev, [surveyId]: type }));
    setOpenDD(null);
  };

  const handleSetVariant = (surveyId: string, variant: string) => {
    setVariantOverrides((prev) => ({ ...prev, [surveyId]: variant }));
    setOpenDD(null);
  };

  const handleCustomType = useCallback((surveyId: string, value: string) => {
    if (!value.trim()) return;
    const val = value.trim();
    if (!customTypes.includes(val) && !SURVEY_TYPES.includes(val)) {
      setCustomTypes((prev) => [...prev, val]);
    }
    handleSetType(surveyId, val);
  }, [customTypes]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className={styles.pickerCard}>
        <div className={styles.pickerLoading}>Carregando surveys do Typeform...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pickerCard}>
        <div className={styles.pickerError}>Erro ao carregar: {error}</div>
      </div>
    );
  }

  if (!surveys.length) return null;

  return (
    <div className={styles.pickerCard} ref={wrapRef}>
      <div className={styles.pickerHeader}>
        <div>
          <div className={styles.pickerTitle}>Surveys disponíveis</div>
          <div className={styles.pickerSub}>Últimas 50 do workspace · clique no tipo ou variante pra editar</div>
        </div>
        <input
          type="text"
          className={styles.pickerFilter}
          placeholder="Filtrar..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className={styles.pickerTableWrap}>
        <table className={styles.pickerTable}>
          <thead>
            <tr>
              <th className={styles.pickerCb}><input type="checkbox" checked={filtered.length > 0 && filtered.every((s) => selected.has(s.id))} onChange={toggleAll} /></th>
              <th>Survey</th>
              <th>Brand</th>
              <th className={styles.pickerColType}>Tipo</th>
              <th className={styles.pickerColVariant}>Variante</th>
              <th className={styles.pickerColDate}>Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const isSelected = selected.has(s.id);
              const surveyType = getType(s);
              const surveyVariant = getVariant(s);
              const isKnownType = SURVEY_TYPES.includes(surveyType) || customTypes.includes(surveyType);

              return (
                <tr key={s.id} className={isSelected ? styles.pickerRowSel : ''}>
                  <td className={styles.pickerCb}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(s.id)} />
                  </td>
                  <td>
                    <div className={styles.pickerName} title={s.title}>
                      {s.title.replace(/^HYPR[_\s]*Survey[_\s]*/i, '')}
                    </div>
                  </td>
                  <td><span className={styles.pickerBrand}>{s.brand}</span></td>
                  <td>
                    <div className={styles.ddWrap}>
                      <button
                        className={`${styles.ddTrigger} ${isKnownType ? styles.ddTriggerType : styles.ddTriggerNeutral}`}
                        onClick={(e) => { e.stopPropagation(); setOpenDD(openDD === `type-${s.id}` ? null : `type-${s.id}`); }}
                      >
                        {surveyType || '—'}
                        <svg viewBox="0 0 10 6" width="8" height="8"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                      {openDD === `type-${s.id}` && (
                        <div className={styles.ddPanel} onClick={(e) => e.stopPropagation()}>
                          <input
                            className={styles.ddInput}
                            placeholder="Digitar tipo..."
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomType(s.id, (e.target as HTMLInputElement).value); }}
                          />
                          {allTypes.map((t) => (
                            <div
                              key={t}
                              className={`${styles.ddItem} ${t === surveyType ? styles.ddItemActive : ''}`}
                              onClick={() => handleSetType(s.id, t)}
                            >{t}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.ddWrap}>
                      <button
                        className={`${styles.ddTrigger} ${
                          surveyVariant === 'Controle' ? styles.ddTriggerControle :
                          surveyVariant === 'Exposto' ? styles.ddTriggerExposto :
                          styles.ddTriggerNeutral
                        }`}
                        onClick={(e) => { e.stopPropagation(); setOpenDD(openDD === `var-${s.id}` ? null : `var-${s.id}`); }}
                      >
                        {surveyVariant || '—'}
                        <svg viewBox="0 0 10 6" width="8" height="8"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                      {openDD === `var-${s.id}` && (
                        <div className={styles.ddPanel} onClick={(e) => e.stopPropagation()}>
                          <input
                            className={styles.ddInput}
                            placeholder="Digitar variante..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) handleSetVariant(s.id, val);
                              }
                            }}
                          />
                          {variantOptions.map((v) => (
                            <div
                              key={v}
                              className={`${styles.ddItem} ${v === surveyVariant ? styles.ddItemActive : ''}`}
                              onClick={() => handleSetVariant(s.id, v)}
                            >{v}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={styles.pickerDate}>{formatDate(s.lastUpdated)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.pickerFooter}>
        <span className={styles.pickerCount}>{selected.size} selecionada{selected.size !== 1 ? 's' : ''}</span>
        <div className={styles.pickerActions}>
          <div className={styles.pickerSizePills}>
            <span className={styles.pickerSizeLabel}>Size:</span>
            {SURVEY_SIZES.map((sz) => (
              <button
                key={sz}
                className={`${styles.sizePill} ${size === sz ? styles.active : ''}`}
                onClick={() => setSize(sz)}
              >{sz}</button>
            ))}
          </div>
          <button
            className={styles.pickerAddBtn}
            disabled={selected.size === 0}
            onClick={handleAdd}
          >Adicionar selecionadas</button>
        </div>
      </div>
    </div>
  );
}
