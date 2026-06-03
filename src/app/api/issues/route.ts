import { NextRequest, NextResponse } from "next/server";
import { createIssue, listIssues } from "@/lib/github";
import { IssueKind } from "@/types";

export const runtime = "nodejs";

function isValidState(value: string | null): value is "open" | "closed" | "all" {
  return value === "open" || value === "closed" || value === "all";
}

export async function GET(req: NextRequest) {
  const stateParam = req.nextUrl.searchParams.get("state");
  const state = isValidState(stateParam) ? stateParam : "all";

  try {
    const issues = await listIssues(state);
    return NextResponse.json({ issues });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let payload: {
    kind?: IssueKind;
    title?: string;
    description?: string;
    reporter?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { kind, title, description, reporter } = payload;

  if (kind !== "bug" && kind !== "mejora") {
    return NextResponse.json(
      { error: "El tipo debe ser 'bug' o 'mejora'" },
      { status: 400 }
    );
  }
  if (!title || !title.trim()) {
    return NextResponse.json(
      { error: "El título es obligatorio" },
      { status: 400 }
    );
  }

  const kindLabel = kind === "bug" ? "🐛 Bug" : "✨ Mejora";
  const body = [
    description?.trim() || "_(Sin descripción)_",
    "",
    "---",
    `**Tipo:** ${kindLabel}`,
    reporter ? `**Reportado por:** ${reporter}` : null,
    "_Creado desde la app FinanceKJ._",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const issue = await createIssue({ title: title.trim(), body, kind });
    return NextResponse.json({ issue }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
