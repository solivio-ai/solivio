import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const name = file.name;
  const title = name.replace(/\.[^.]+$/, "");
  const type = file.type;

  let body: string;

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    body = data.text.trim();
  } else {
    body = (await file.text()).trim();
  }

  return NextResponse.json({ title, body });
}
