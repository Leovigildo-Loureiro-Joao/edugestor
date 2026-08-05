export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

function escapeCSV(
  value: string | number | boolean | null | undefined
): string {

  if (value === undefined || value === null) {
    return '';
  }

  const str = String(value);

  if (
    str.includes(';') ||
    str.includes('"') ||
    str.includes('\n')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}


export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {

  const separator = ';';

  const header = columns
    .map(c => escapeCSV(c.header))
    .join(separator);

  const rows = data.map(row =>
    columns
      .map(c => escapeCSV(c.accessor(row)))
      .join(separator)
  );

  const csvContent =
    '\uFEFF' +
    [header, ...rows].join('\n');


  const blob = new Blob(
    [csvContent],
    { type: 'text/csv;charset=utf-8;' }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;
  link.download =
    `${filename}_${new Date().toISOString().slice(0,10)}.csv`;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}