import { ImportTransactionRow } from './repositories/transaction.repository';

export interface ParsedCsvRow {
  line: number;
  data?: ImportTransactionRow;
  error?: string;
}

// Column order is flexible (matched by header name, case-insensitive) —
// only "date", "description", and "amount" are required; "category" and
// "notes" are optional. Amount is signed (negative = expense, positive =
// income), matching a real bank statement export — see decisions.md.
export function parseTransactionsCsv(text: string): ParsedCsvRow[] {
  const records = tokenizeCsv(text);
  if (records.length === 0) {
    return [];
  }

  const header = records[0].map((cell) => cell.trim().toLowerCase());
  const dateIndex = header.indexOf('date');
  const descriptionIndex = header.indexOf('description');
  const amountIndex = header.indexOf('amount');
  const categoryIndex = header.indexOf('category');
  const notesIndex = header.indexOf('notes');

  if (dateIndex === -1 || descriptionIndex === -1 || amountIndex === -1) {
    return [
      {
        line: 1,
        error: 'Header row must include "date", "description", and "amount" columns',
      },
    ];
  }

  return records.slice(1).map((cells, index) => {
    const line = index + 2; // 1-indexed, plus the header row
    const date = cells[dateIndex]?.trim() ?? '';
    const description = cells[descriptionIndex]?.trim() ?? '';
    const amountText = cells[amountIndex]?.trim() ?? '';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { line, error: `Invalid date "${date}" (expected YYYY-MM-DD)` };
    }
    if (!description) {
      return { line, error: 'Missing description' };
    }
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount === 0) {
      return { line, error: `Invalid amount "${amountText}"` };
    }

    const category = categoryIndex >= 0 ? cells[categoryIndex]?.trim() : undefined;
    const notes = notesIndex >= 0 ? cells[notesIndex]?.trim() : undefined;

    return {
      line,
      data: {
        date,
        description,
        amount,
        category: category || undefined,
        notes: notes || undefined,
      },
    };
  });
}

// A minimal RFC4180-ish tokenizer: quoted fields may contain commas,
// newlines, and escaped quotes ("" -> a literal ").
function tokenizeCsv(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    records.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ',') {
      pushField();
      i++;
      continue;
    }
    if (char === '\r') {
      i++;
      continue;
    }
    if (char === '\n') {
      pushRow();
      i++;
      continue;
    }
    field += char;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return records.filter((record) => !(record.length === 1 && record[0].trim() === ''));
}
