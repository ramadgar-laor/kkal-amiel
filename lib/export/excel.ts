import ExcelJS from "exceljs";

/**
 * Builds a single-sheet .xlsx workbook from a header row + data rows, styled
 * to be readable as a Hebrew/RTL spreadsheet (bold frozen header row, RTL
 * sheet view, autosized columns), and returns it as a Buffer ready to be
 * streamed back as a file download.
 */
export async function buildExcelWorkbook({
  sheetName,
  headers,
  rows,
}: {
  sheetName: string;
  headers: string[];
  rows: (string | number | null)[][];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'מערכת ניהול שגרירי קק"ל';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });

  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 4, 14), 42),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2F6F4E" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 28;

  for (const row of rows) {
    const added = sheet.addRow(row);
    added.alignment = { horizontal: "right", vertical: "top", wrapText: true };
  }

  // Keep columns readable even when a cell holds a long multi-line block
  // (e.g. a combined budget/supplier summary) without blowing up row height
  // indefinitely.
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = 18;
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function excelResponseHeaders(filename: string) {
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
  };
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("he-IL");
}

export function yesNo(value: boolean | null | undefined) {
  if (value === null || value === undefined) return null;
  return value ? "כן" : "לא";
}
