// Builds docs/ba/BA_Harminovich_Artsiom.docx from BA.md (main text) and BA-back.md (references,
// appendices, statement).   node docs/ba/build/build-docx.mjs
// Markers [[TBD: …]] are kept in the text and highlighted in yellow until they are filled in.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat, Packer,
  PageBreak, PageNumber, Paragraph, ShadingType, Tab, Table, TableCell, TableOfContents, TableRow,
  TextRun, VerticalAlign, WidthType,
} from "docx";
import { estimatePageNumbersWith } from "docx/layout";

const here = import.meta.dirname;
const root = path.resolve(here, "..");
const FONT = "Times New Roman";
const PAGE_W = 11906; // A4, DXA
const MARGIN = { top: 1134, bottom: 1134, left: 1701, right: 851 }; // 2 / 2 / 3 / 1.5 cm
const TEXT_W = PAGE_W - MARGIN.left - MARGIN.right; // 9354 DXA ≈ 16.5 cm
const EMU_PER_PX = 9525;

// ---------- inline text ----------
function runs(text, base = {}) {
  const out = [];
  const pattern = /(\[\[TBD:[^\]]*\]\]|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) out.push(new TextRun({ text: text.slice(last, match.index), ...base }));
    const token = match[0];
    if (token.startsWith("[[TBD:")) {
      out.push(new TextRun({ text: `[TBD:${token.slice(6, -2)}]`, highlight: "yellow", ...base }));
    } else if (token.startsWith("**")) {
      out.push(...runs(token.slice(2, -2), { ...base, bold: true }));
    } else if (token.startsWith("`")) {
      out.push(new TextRun({ text: token.slice(1, -1), font: "Consolas", ...base }));
    } else {
      out.push(...runs(token.slice(1, -1), { ...base, italics: true }));
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

// ---------- images ----------
function imageSize(buffer) {
  if (buffer[0] === 0x89) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  for (let i = 2; i < buffer.length; ) {
    const marker = buffer[i + 1];
    const length = buffer.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { width: buffer.readUInt16BE(i + 7), height: buffer.readUInt16BE(i + 5) };
    i += 2 + length;
  }
  throw new Error("unknown image size");
}

function image(file, { maxWidthCm, maxHeightCm }) {
  const data = readFileSync(path.join(root, file));
  const { width, height } = imageSize(data);
  const cmToPx = 96 / 2.54;
  const scale = Math.min((maxWidthCm * cmToPx) / width, (maxHeightCm * cmToPx) / height, 1);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    spacing: { before: 120, after: 60 },
    children: [new ImageRun({
      type: file.endsWith(".png") ? "png" : "jpg",
      data,
      transformation: { width: Math.round(width * scale), height: Math.round(height * scale) },
    })],
  });
}

// ---------- tables ----------
const border = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };

function table(lines) {
  const rows = lines
    .filter((line) => !/^\|\s*-+/.test(line))
    .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
  const cols = rows[0].length;
  // Column widths follow the length of the content, within sensible bounds.
  const weight = Array.from({ length: cols }, (_, c) =>
    Math.min(60, Math.max(8, Math.max(...rows.map((row) => (row[c] ?? "").length)) ** 0.8)),
  );
  const total = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map((w) => Math.floor((w / total) * TEXT_W));
  widths[cols - 1] += TEXT_W - widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: TEXT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((row, r) => new TableRow({
      tableHeader: r === 0,
      cantSplit: true,
      children: row.map((cell, c) => new TableCell({
        width: { size: widths[c], type: WidthType.DXA },
        borders,
        verticalAlign: VerticalAlign.TOP,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        shading: r === 0 ? { type: ShadingType.CLEAR, fill: "E7E9EE", color: "auto" } : undefined,
        children: [new Paragraph({
          spacing: { before: 0, after: 0, line: 240 },
          children: runs(cell, { size: 20, bold: r === 0 || undefined }),
        })],
      })),
    })),
  });
}

// Mockups in the main text go in two columns: the volume limit counts them, and Appendix B has full-size copies.
const noBorder = { style: BorderStyle.NONE, size: 0, color: "auto" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };

function isMainTextMockup(line) {
  const match = line.match(/^!\[(.+)\]\((.+)\)/);
  return Boolean(match) && match[2].includes("mockup") && !/^[A-Z]\.\d+ — /.test(match[1]);
}

function mockupGrid(lines, chapter) {
  const half = Math.floor(TEXT_W / 2);
  const cell = (line) => {
    const [, alt, file] = line.match(/^!\[(.+)\]\((.+)\)/);
    figureCount[chapter] = (figureCount[chapter] ?? 0) + 1;
    return new TableCell({
      width: { size: half, type: WidthType.DXA },
      borders: noBorders,
      margins: { top: 40, bottom: 80, left: 60, right: 60 },
      children: [
        image(file, { maxWidthCm: 7.9, maxHeightCm: 5.2 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 240 },
          children: runs(`Figure ${chapter}.${figureCount[chapter]} — ${alt}`, { size: 20 }),
        }),
      ],
    });
  };
  const rows = [];
  for (let i = 0; i < lines.length; i += 2) {
    rows.push(new TableRow({ cantSplit: true, children: [cell(lines[i]), lines[i + 1] ? cell(lines[i + 1]) : new TableCell({ width: { size: half, type: WidthType.DXA }, borders: noBorders, children: [new Paragraph({ children: [] })] })] }));
  }
  return new Table({ width: { size: half * 2, type: WidthType.DXA }, columnWidths: [half, half], borders: noBorders, rows });
}

// ---------- markdown blocks ----------
let listInstance = 0;
const figureCount = {};

function convert(markdown) {
  const blocks = [];
  const lines = markdown.replace(/\r/g, "").split("\n");
  let chapter = "";
  let section = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    let match;
    if ((match = line.match(/^# (.+)/))) {
      const title = match[1];
      section = title;
      chapter = title.match(/^(\d+)\s/)?.[1] ?? (title.match(/^Appendix ([A-Z])/)?.[1] ?? "");
      blocks.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        children: [new TextRun(title)],
      }));
      continue;
    }
    if ((match = line.match(/^## (.+)/))) {
      blocks.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(match[1])] }));
      continue;
    }
    if (isMainTextMockup(line)) {
      const group = [];
      while (i < lines.length && (!lines[i].trim() || isMainTextMockup(lines[i]))) {
        if (lines[i].trim()) group.push(lines[i]);
        i++;
      }
      i--;
      blocks.push(mockupGrid(group, chapter));
      blocks.push(new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }));
      continue;
    }
    if ((match = line.match(/^!\[(.+)\]\((.+)\)/))) {
      const [, alt, file] = match;
      const fixed = alt.match(/^([A-Z]\.\d+) — (.+)/);
      const appendix = Boolean(fixed);
      const mockup = file.includes("mockup") || file.includes("analog");
      blocks.push(image(file, appendix
        ? { maxWidthCm: 16.5, maxHeightCm: 23 }
        : { maxWidthCm: mockup ? 12.5 : 15, maxHeightCm: mockup ? 8 : 11 }));
      let label;
      if (fixed) label = `Figure ${fixed[1]} — ${fixed[2]}`;
      else {
        figureCount[chapter] = (figureCount[chapter] ?? 0) + 1;
        label = `Figure ${chapter}.${figureCount[chapter]} — ${alt}`;
      }
      blocks.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: runs(label, { size: 22 }),
      }));
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      i--;
      blocks.push(table(rows));
      blocks.push(new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }));
      continue;
    }
    if (/^Table [A-Z0-9.]+ — /.test(line)) {
      blocks.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: 60 }, children: runs(line, { italics: true }) }));
      continue;
    }
    if (section === "References" && (match = line.match(/^(\d+)\. (.+)/))) {
      blocks.push(new Paragraph({
        indent: { left: 567, hanging: 567 },
        spacing: { after: 60 },
        children: [new TextRun({ children: [`[${match[1]}]`, new Tab()] }), ...runs(match[2])],
      }));
      continue;
    }
    if ((match = line.match(/^(\s*)(-|\d+\.) (.+)/))) {
      const ordered = /\d/.test(match[2]);
      const instance = ++listInstance;
      while (i < lines.length && (match = lines[i].match(/^(\s*)(-|\d+\.) (.+)/))) {
        const level = match[1].length >= 2 ? 1 : 0;
        const nestedOrdered = /\d/.test(match[2]);
        blocks.push(new Paragraph({
          numbering: { reference: (level ? nestedOrdered : ordered) ? "numbers" : "bullets", level, instance: level ? instance + 1000 : instance },
          spacing: { after: 60 },
          children: runs(match[3]),
        }));
        i++;
      }
      i--;
      continue;
    }
    // Given/When/Then steps of an acceptance criterion: one compact, indented block.
    if (/^\*\*(Given|When|Then)\*\* /.test(line)) {
      blocks.push(new Paragraph({ indent: { left: 360 }, spacing: { after: line.startsWith("**Then") ? 160 : 0, line: 264 }, keepNext: line.startsWith("**Given") || line.startsWith("**When"), children: runs(line) }));
      continue;
    }
    blocks.push(new Paragraph({ children: runs(line) }));
  }
  return blocks;
}

// ---------- title page ----------
const center = (text, options = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: runs(text, options) });
const titlePage = [
  center("Study programme: Informatics", { size: 24 }),
  new Paragraph({ spacing: { before: 2400 }, children: [] }),
  center("Diploma Project", { size: 28 }),
  center("REAL-TIME COLLABORATIVE CODE EDITING PLATFORM BASED ON CRDT", { size: 32, bold: true }),
  center("Business Analysis block: Introduction, Chapter 1 (Analytical part) and Chapter 2 (System requirements)", { size: 24, italics: true }),
  new Paragraph({ spacing: { before: 2000 }, children: [] }),
  ...[
    ["Author:", "Artsiom Harminovich"],
    ["Supervisor:", "[[TBD: supervisor's full name]]"],
    ["Project type:", "Individual"],
  ].map(([label, value]) => new Paragraph({
    indent: { left: 4800 },
    spacing: { after: 120 },
    children: [new TextRun({ text: `${label} `, bold: true }), ...runs(value)],
  })),
  new Paragraph({ spacing: { before: 2400 }, children: [] }),
  center("2026", { size: 24 }),
];

// ---------- document ----------
const main = readFileSync(path.join(root, "BA.md"), "utf8");
const back = readFileSync(path.join(root, "BA-back.md"), "utf8");

const doc = new Document({
  // Page numbers worked out as Word lays the pages out, so the table of contents arrives filled in
  // and Word does not ask to update it on opening. It stays a real table that Word can update.
  pageNumbers: estimatePageNumbersWith({ guess: true }),
  creator: "Artsiom Harminovich",
  title: "Real-Time Collaborative Code Editing Platform Based on CRDT — Business Analysis",
  styles: {
    default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { line: 276, after: 120 } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT }, paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: FONT }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ] },
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.DECIMAL, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ] },
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
      children: titlePage,
    },
    {
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN, pageNumbers: { start: 2 } } },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT] })] })] }),
      },
      children: [
        // Not a heading, so that it does not list itself.
        new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "Contents", bold: true, size: 32 })] }),
        new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        ...convert(main),
        ...convert(back),
      ],
    },
  ],
});

const out = path.join(root, "BA_Harminovich_Artsiom.docx");
writeFileSync(out, await Packer.toBuffer(doc));
console.log("written", out);
