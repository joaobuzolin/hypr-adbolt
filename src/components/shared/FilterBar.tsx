import styles from './FilterBar.module.css';

interface PillFilter {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  pills?: {
    options: PillFilter[];
    active: string;
    onChange: (value: string) => void;
  };
  sizeOptions?: string[];
  sizeValue?: string;
  onSizeChange?: (value: string) => void;
  countText?: string;
  onSelectFiltered?: () => void;
  onClear?: () => void;
  showClear?: boolean;
  children?: React.ReactNode;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Filtrar por nome...',
  pills,
  sizeOptions,
  sizeValue,
  onSizeChange,
  countText,
  onSelectFiltered,
  onClear,
  showClear,
  children,
}: FilterBarProps) {
  return (
    <div className={styles.row}>
      <input
        type="text"
        className={styles.search}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
      />

      {pills && (
        <div className={styles.pills}>
          {pills.options.map((p) => (
            <button
              key={p.value}
              className={`${styles.pill} ${pills.active === p.value ? styles.active : ''}`}
              onClick={() => pills.onChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {sizeOptions && sizeOptions.length > 0 && onSizeChange && (
        <select
          className={styles.sizeSelect}
          value={sizeValue || 'all'}
          onChange={(e) => onSizeChange(e.target.value)}
          aria-label="Filtrar por size"
        >
          <option value="all">Todos os sizes ({sizeOptions.length})</option>
          {sizeOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {countText && <span className={styles.count}>{countText}</span>}

      {onSelectFiltered && (
        <button className={styles.selectBtn} onClick={onSelectFiltered}>
          Selecionar filtrados
        </button>
      )}

      {showClear && onClear && (
        <button className={styles.clearBtn} onClick={onClear}>
          ✕ Limpar
        </button>
      )}

      {children}
    </div>
  );
}
