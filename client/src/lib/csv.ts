// ============================================================================
// csv.ts — Utilidad para exportar datos a CSV
// ============================================================================

interface CsvColumn<T> {
  header: string;
  value:  (row: T) => string | number | null | undefined;
}

export function exportCsv<T>(
  filename: string,
  columns:  CsvColumn<T>[],
  data:     T[],
) {
  const separator = ';';

  const header = columns.map((c) => escapeCsvField(c.header)).join(separator);

  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = c.value(row);
        return escapeCsvField(val == null ? '' : String(val));
      })
      .join(separator),
  );

  const bom = '\uFEFF';
  const csv = bom + [header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href     = url;
  link.download = `${filename}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function escapeCsvField(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
