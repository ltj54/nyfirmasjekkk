import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export async function GET() {
  const templatePath = path.resolve(process.cwd(), "..", "data", "outreach-email-template.md");

  try {
    const content = await readFile(templatePath, "utf-8");
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Failed to read outreach email template", error);
    return NextResponse.json(
      {
        title: "Mal utilgjengelig",
        detail: "Klarte ikke lese outreach-email-template.md.",
      },
      { status: 500 }
    );
  }
}
