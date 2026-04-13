import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useColumnResize – drag-to-resize table columns.
 *
 * Usage:
 *   const { colWidths, headerProps, tableProps } = useColumnResize({
 *     storageKey: 'assets-table',
 *     columns: [
 *       { key: 'cb',      minWidth: 40,  defaultWidth: 40,  resizable: false },
 *       { key: 'name',    minWidth: 120, defaultWidth: 260 },
 *       { key: 'tracker', minWidth: 100, defaultWidth: 200 },
 *     ],
 *   });
 *
 *   <table {...tableProps}>
 *     <thead><tr>
 *       {columns.map((col, i) => <th key={col.key} {...headerProps(i)}>…</th>)}
 *     </tr></thead>
 *   </table>
 */

export interface ColumnDef {
  key: string;
  minWidth: number;
  defaultWidth: number;
  /** Set false for checkbox / action columns that shouldn't resize. Default: true */
  resizable?: boolean;
}

interface UseColumnResizeOptions {
  /** localStorage key for persisting widths. Omit to disable persistence. */
  storageKey?: string;
  columns: ColumnDef[];
}

interface HeaderProps {
  style: React.CSSProperties;
  /** Only present on resizable columns */
  children?: never;
  'data-resizable'?: boolean;
}

export function useColumnResize({ columns, storageKey }: UseColumnResizeOptions) {
  // ── Hydrate from localStorage ──
  const loadSaved = (): number[] => {
    if (!storageKey) return columns.map((c) => c.defaultWidth);
    try {
      const raw = localStorage.getItem(`adbolt-col-${storageKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        if (parsed.length === columns.length) return parsed;
      }
    } catch { /* ignore corrupt data */ }
    return columns.map((c) => c.defaultWidth);
  };

  const [widths, setWidths] = useState<number[]>(loadSaved);

  // Refs for drag state (avoid re-renders during drag)
  const dragging = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  // ── Persist to localStorage on change ──
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`adbolt-col-${storageKey}`, JSON.stringify(widths));
    }
  }, [widths, storageKey]);

  // ── Mouse handlers ──
  const onMouseDown = useCallback((colIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = {
      colIdx,
      startX: e.clientX,
      startW: widthsRef.current[colIdx],
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const d = dragging.current;
      if (!d) return;
      const delta = e.clientX - d.startX;
      const min = columns[d.colIdx].minWidth;
      const next = Math.max(min, d.startW + delta);
      setWidths((prev) => {
        const copy = [...prev];
        copy[d.colIdx] = next;
        return copy;
      });
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [columns]);

  // ── Double-click to reset a single column ──
  const onDoubleClick = useCallback((colIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    setWidths((prev) => {
      const copy = [...prev];
      copy[colIdx] = columns[colIdx].defaultWidth;
      return copy;
    });
  }, [columns]);

  // ── Reset all columns ──
  const resetAll = useCallback(() => {
    setWidths(columns.map((c) => c.defaultWidth));
  }, [columns]);

  // ── Build per-header props ──
  const headerProps = useCallback(
    (colIdx: number): {
      style: React.CSSProperties;
      className?: string;
      children?: React.ReactNode;
    } & Record<string, unknown> => {
      const col = columns[colIdx];
      const resizable = col.resizable !== false;
      const userResized = widths[colIdx] !== col.defaultWidth;

      return {
        style: {
          // Fixed columns (cb, thumb, actions) always use exact width
          // Resizable columns use width when user has resized, otherwise let table distribute
          ...(col.resizable === false
            ? { width: widths[colIdx], maxWidth: widths[colIdx] }
            : userResized
              ? { width: widths[colIdx], minWidth: col.minWidth }
              : { minWidth: col.minWidth }),
          position: 'relative' as const,
        },
        'data-resizable': resizable || undefined,
      };
    },
    [columns, widths],
  );

  // ── The resize handle element factory ──
  const ResizeHandle = useCallback(
    ({ colIdx }: { colIdx: number }) => {
      const col = columns[colIdx];
      if (col.resizable === false) return null;

      return (
        <span
          className="col-resize-handle"
          onMouseDown={(e) => onMouseDown(colIdx, e)}
          onDoubleClick={(e) => onDoubleClick(colIdx, e)}
          role="separator"
          aria-orientation="vertical"
          aria-label={`Redimensionar coluna ${col.key}`}
        />
      );
    },
    [columns, onMouseDown, onDoubleClick],
  );

  // ── Table-level style ──
  const tableStyle: React.CSSProperties = {
    width: '100%',
  };

  return {
    colWidths: widths,
    headerProps,
    ResizeHandle,
    tableStyle,
    resetAll,
  };
}
