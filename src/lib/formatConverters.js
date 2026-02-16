import * as XLSX from "xlsx";

//  Convert processed data to CSV format
export function toCSV(data) {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      return typeof val === "number" ? val.toFixed(6) : String(val || "");
    }),
  );

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

//  Convert processed data to Fixed-Width TXT format
export function toFWTXT(data) {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      return typeof val === "number" ? val.toFixed(6) : String(val || "");
    }),
  );

  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...rows.map((r) => (r[i] || "").length));
    return Math.max(maxLen, 15);
  });

  const formatRow = (cells) =>
    cells.map((c, i) => c.padEnd(colWidths[i])).join(" | ");

  const separator = colWidths.map((w) => "=".repeat(w)).join("=|=");

  return [formatRow(headers), separator, ...rows.map(formatRow)].join("\n");
}

// Convert the processed data into excel sheet
export function toXLSX(data, sheetName = "Sheet1") {
  if (!data || !data.length) return Buffer.from([]);

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const v = row[h];
      return typeof v === "number" ? Number(v.toFixed(6)) : v;
    }),
  );

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function convertDataToFormat(data, format, sheetName) {
  if (format === "csv") {
    return { content: toCSV(data), ext: "csv", type: "text/csv" };
  }
  if (format === "fw.txt") {
    return { content: toFWTXT(data), ext: "fw.txt", type: "text/plain" };
  }
  if (format === "xlsx") {
    return {
      content: toXLSX(data, sheetName),
      ext: "xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
  throw new Error("Unsupported format");
}
