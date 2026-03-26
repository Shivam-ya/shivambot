import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";

export interface ExportMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

function buildParagraphs(role: "user" | "assistant", content: string): Paragraph[] {
  const clean = stripThinkTags(content);
  const lines = clean.split("\n").filter((l) => l.trim() !== "");

  const rolePara = new Paragraph({
    children: [
      new TextRun({
        text: role === "user" ? "🧑 You" : "🤖 SHIVAM Chatbot",
        bold: true,
        color: role === "user" ? "00D4CF" : "7C3AED",
        size: 22,
      }),
    ],
    spacing: { after: 60 },
  });

  const contentParas = lines.map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 20,
            color: "CCCCCC",
          }),
        ],
        spacing: { after: 40 },
      })
  );

  const divider = new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "333333" },
    },
    spacing: { after: 120 },
  });

  return [rolePara, ...contentParas, divider];
}

export async function exportToDocx(
  messages: ExportMessage[],
  title = "SHIVAM Chatbot Chat Export"
): Promise<void> {
  const headerPara = new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  });

  const datePara = new Paragraph({
    children: [
      new TextRun({
        text: `Exported on ${new Date().toLocaleString()}`,
        italics: true,
        color: "888888",
        size: 18,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  });

  const messageParagraphs = messages.flatMap((m) => buildParagraphs(m.role, m.content));

  const doc = new Document({
    creator: "SHIVAM Chatbot AI",
    title,
    description: "AI conversation exported from SHIVAM Chatbot",
    sections: [
      {
        children: [headerPara, datePara, ...messageParagraphs],
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            color: "EEEEEE",
          },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${title.replace(/\s+/g, "_")}_${Date.now()}.docx`;
  saveAs(blob, filename);
}

export async function exportSingleMessage(
  message: ExportMessage,
  sessionTitle = "SHIVAM Chatbot"
): Promise<void> {
  return exportToDocx([message], `${sessionTitle}_snippet`);
}
