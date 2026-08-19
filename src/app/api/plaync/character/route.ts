import { NextResponse } from "next/server";
import { TARGET_LEGION } from "@/lib/constants";
import { PlayncError, getCharacterDetail } from "@/lib/plaync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const characterId = new URL(req.url).searchParams.get("characterId");
  if (!characterId) {
    return NextResponse.json({ error: "characterId 가 필요합니다." }, { status: 400 });
  }

  try {
    const detail = await getCharacterDetail(characterId);
    return NextResponse.json({
      character: detail,
      inLegion: detail.regionName === TARGET_LEGION,
    });
  } catch (err) {
    const status = err instanceof PlayncError ? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "캐릭터 조회에 실패했습니다." },
      { status },
    );
  }
}
