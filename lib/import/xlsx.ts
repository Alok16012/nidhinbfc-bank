/**
 * Minimal .xlsx reader.
 *
 * The ledger workbook we import is a plain SpreadsheetML file: a ZIP holding
 * shared strings and one XML part per sheet. Rather than pull in a spreadsheet
 * library (and its supply chain) for a single import screen, this reads the
 * few parts we need using DecompressionStream, which every browser we target
 * ships natively.
 *
 * Deliberately not supported, because the source file uses none of it:
 * ZIP64, encryption, and number-format detection. Cells come back as raw
 * strings or numbers; callers decide when a number is an Excel date serial
 * (in the ledger sheets, position tells you — see ledger-sheet.ts).
 */

export interface XlsxSheet {
  name: string;
  /** Row-major, 0-based, sparse-filled to a rectangle. */
  rows: XlsxCell[][];
}

export type XlsxCell = string | number | null;

// ── ZIP ──────────────────────────────────────────────────────────────────

interface ZipEntry {
  name: string;
  compressed: boolean;
  offset: number;
  compressedSize: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

function findEndOfCentralDirectory(view: DataView): number {
  // The EOCD sits at the tail, after an optional comment of up to 64 KB.
  const start = Math.max(0, view.byteLength - 0x10000 - 22);
  for (let at = view.byteLength - 22; at >= start; at--) {
    if (view.getUint32(at, true) === EOCD_SIGNATURE) return at;
  }
  throw new Error("Not a valid .xlsx file (no ZIP end-of-directory record).");
}

function readCentralDirectory(buffer: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buffer);
  const eocd = findEndOfCentralDirectory(view);
  const count = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);

  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder();

  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== CENTRAL_SIGNATURE) break;
    const method = view.getUint16(at + 10, true);
    const compressedSize = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const offset = view.getUint32(at + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, at + 46, nameLength));

    entries.set(name, { name, compressed: method === 8, offset, compressedSize });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readEntry(buffer: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(buffer);
  // The central directory's extra field can differ from the local header's, so
  // the payload offset has to come from the local header itself.
  const nameLength = view.getUint16(entry.offset + 26, true);
  const extraLength = view.getUint16(entry.offset + 28, true);
  const start = entry.offset + 30 + nameLength + extraLength;
  const bytes = new Uint8Array(buffer, start, entry.compressedSize);

  if (!entry.compressed) return new TextDecoder().decode(bytes);

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

// ── XML ──────────────────────────────────────────────────────────────────

const XML_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
};

function decodeXml(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, code: string) => {
    if (code[0] === "#") {
      const value = code[1] === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : whole;
    }
    return XML_ENTITIES[code] ?? whole;
  });
}

/** "BC12" → 54 (0-based column index). */
export function columnIndex(reference: string): number {
  let index = 0;
  for (let i = 0; i < reference.length; i++) {
    const code = reference.charCodeAt(i);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  // Each <si> is one string, possibly split across rich-text <t> runs.
  const items = xml.match(/<si>[\s\S]*?<\/si>|<si\/>/g) ?? [];
  for (const item of items) {
    let text = "";
    for (const part of item.match(/<t[^>]*>[\s\S]*?<\/t>/g) ?? []) {
      text += decodeXml(part.replace(/^<t[^>]*>/, "").replace(/<\/t>$/, ""));
    }
    strings.push(text);
  }
  return strings;
}

function parseSheet(xml: string, sharedStrings: string[]): XlsxCell[][] {
  const rows: XlsxCell[][] = [];
  // The attribute groups must be lazy: a greedy [^>]* swallows the "/" of a
  // self-closing <c .../> tag, after which the ">" branch runs on to the next
  // closing tag and eats every cell in between.
  const rowPattern = /<row\b[^>]*?\br="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g;
  const cellPattern = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(xml)) !== null) {
    const rowNumber = Number(rowMatch[1]);
    const body = rowMatch[2];
    const cells: XlsxCell[] = [];
    if (body) {
      let cellMatch: RegExpExecArray | null;
      cellPattern.lastIndex = 0;
      while ((cellMatch = cellPattern.exec(body)) !== null) {
        const attributes = cellMatch[1];
        const content = cellMatch[2] ?? "";
        const reference = /\br="([A-Z]+)\d+"/.exec(attributes)?.[1];
        const type = /\bt="([^"]+)"/.exec(attributes)?.[1];
        const at = reference ? columnIndex(reference) : cells.length;

        let value: XlsxCell = null;
        if (type === "inlineStr") {
          let text = "";
          for (const part of content.match(/<t[^>]*>[\s\S]*?<\/t>/g) ?? []) {
            text += decodeXml(part.replace(/^<t[^>]*>/, "").replace(/<\/t>$/, ""));
          }
          value = text;
        } else {
          const raw = /<v>([\s\S]*?)<\/v>/.exec(content)?.[1];
          if (raw !== undefined) {
            if (type === "s") {
              value = sharedStrings[Number(raw)] ?? "";
            } else if (type === "str" || type === "e") {
              value = decodeXml(raw);
            } else {
              const numeric = Number(raw);
              value = Number.isFinite(numeric) ? numeric : decodeXml(raw);
            }
          }
        }

        while (cells.length < at) cells.push(null);
        cells[at] = value === "" ? null : value;
      }
    }
    while (rows.length < rowNumber - 1) rows.push([]);
    rows[rowNumber - 1] = cells;
  }
  return rows;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Read the named sheets out of an .xlsx. Only the requested sheets are
 * decompressed — this workbook's other sheets are tens of megabytes of XML
 * that we never look at.
 */
export async function readXlsxSheets(
  file: ArrayBuffer,
  wanted: string[]
): Promise<XlsxSheet[]> {
  const entries = readCentralDirectory(file);

  const workbookEntry = entries.get("xl/workbook.xml");
  const relsEntry = entries.get("xl/_rels/workbook.xml.rels");
  if (!workbookEntry || !relsEntry) {
    throw new Error("Not a valid .xlsx workbook (missing workbook part).");
  }

  const [workbookXml, relsXml] = await Promise.all([
    readEntry(file, workbookEntry),
    readEntry(file, relsEntry),
  ]);

  const targets = new Map<string, string>(); // relationship id → part name
  for (const rel of relsXml.match(/<Relationship\b[^>]*\/?>/g) ?? []) {
    const id = /\bId="([^"]+)"/.exec(rel)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(rel)?.[1];
    if (id && target) {
      targets.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
    }
  }

  const sharedEntry = entries.get("xl/sharedStrings.xml");
  const sharedStrings = sharedEntry ? parseSharedStrings(await readEntry(file, sharedEntry)) : [];

  const sheets: XlsxSheet[] = [];
  for (const tag of workbookXml.match(/<sheet\b[^>]*\/?>/g) ?? []) {
    const name = decodeXml(/\bname="([^"]*)"/.exec(tag)?.[1] ?? "");
    if (!wanted.includes(name)) continue;

    const relationId = /\br:id="([^"]+)"/.exec(tag)?.[1];
    const part = relationId ? targets.get(relationId) : undefined;
    const entry = part ? entries.get(part) : undefined;
    if (!entry) continue;

    sheets.push({ name, rows: parseSheet(await readEntry(file, entry), sharedStrings) });
  }
  return sheets;
}

/** List sheet names without decompressing any of them. */
export async function readXlsxSheetNames(file: ArrayBuffer): Promise<string[]> {
  const entries = readCentralDirectory(file);
  const workbookEntry = entries.get("xl/workbook.xml");
  if (!workbookEntry) throw new Error("Not a valid .xlsx workbook.");
  const xml = await readEntry(file, workbookEntry);
  return (xml.match(/<sheet\b[^>]*\/?>/g) ?? [])
    .map((tag) => decodeXml(/\bname="([^"]*)"/.exec(tag)?.[1] ?? ""))
    .filter(Boolean);
}

/** Excel serial (1900 date system) → ISO date, UTC-safe. */
export function excelSerialToISODate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  // Serial 1 is 1900-01-01, and Excel wrongly treats 1900 as a leap year, so
  // the epoch is 1899-12-30 for every date after 1900-02-28.
  const milliseconds = Math.round(serial) * 86400000;
  const date = new Date(Date.UTC(1899, 11, 30) + milliseconds);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}
