import { NextResponse } from "next/server";
import { PlayncError, searchCharacters } from "@/lib/plaync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const keyword = new URL(req.url).searchParams.get("keyword") ?? "";

  if (!keyword.trim()) {
    return NextResponse.json({ list: [] });
  }

  try {
    const list = await searchCharacters(keyword);
    return NextResponse.json({ list });
  } catch (err) {
    const status = err instanceof PlayncError ? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "검색에 실패했습니다.", list: [] },
      { status },
    );
  }
}
