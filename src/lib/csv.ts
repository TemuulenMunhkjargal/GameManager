function escapeCsvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);

  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsvField).join(",")];

  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(","));
  }

  // CRLF per RFC 4180; also plays nicer with Excel on Windows.
  return lines.join("\r\n");
}
