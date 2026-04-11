/**
 * Trigger a browser file download from a Blob.
 * Ported from legacy: function dl(blob, fn) — line 2252
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/**
 * Generate and download a CSV file.
 * Ported from legacy: function dlCSV(f, fn) — line 2250
 */
export function downloadCSV(
  headers: string[],
  rows: string[][],
  filename: string,
): void {
  const csvContent = [headers, ...rows]
    .map((r) =>
      r.map((v) => {
        const s = String(v || '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? '"' + s.replace(/"/g, '""') + '"'
          : s;
      }).join(',')
    )
    .join('\n');

  downloadBlob(
    new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
    filename,
  );
}

/**
 * Generate and download an XLSX file using SheetJS.
 * Requires XLSX to be loaded (window.XLSX or dynamic import).
 *
 * Ported from legacy: function dlXLSX(f, fn) — line 2251
 */
export function downloadXLSX(
  headers: string[],
  rows: string[][],
  filename: string,
  options?: {
    colWidths?: Array<{ wch: number }>;
    sheetName?: string;
    instructionRows?: string[][];
  },
): void {
  // SheetJS is loaded as a CDN script — access via window
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error('SheetJS (XLSX) not loaded');
  }

  const wb = XLSX.utils.book_new();
  const allRows = [...(options?.instructionRows || []), headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  if (options?.colWidths) ws['!cols'] = options.colWidths;
  XLSX.utils.book_append_sheet(wb, ws, options?.sheetName || 'Sheet1');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
  );
}
