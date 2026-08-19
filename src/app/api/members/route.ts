import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { SERVER_ID, SERVER_NAME, TARGET_LEGION, sanitizeSlots } from "@/lib/constants";
import { getRepo } from "@/lib/db";
import { canonicalCharacterId, getCharacterDetail } from "@/lib/plaync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ members: await (await getRepo()).listMembers() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "조회 실패" }, { status: 500 });
  }
}

/**
 * 멤버 등록.
 *
 * 닉네임을 믿지 않고 characterId 로 plaync 를 다시 조회해서
 * 직업 / 전투력 / 아이템레벨 / 레기온을 서버에서 직접 채운다.
 * 레기온이 TARGET_LEGION 이 아니면 차단하되, 관리자 세션이면 예외로 통과시킨다.
 */
export async function POST(req: Request) {
  let body: { characterId?: string; slots?: unknown; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.characterId) {
    return NextResponse.json({ error: "캐릭터를 먼저 선택하세요." }, { status: 400 });
  }

  let detail;
  try {
    detail = await getCharacterDetail(body.characterId);
  } catch {
    return NextResponse.json({ error: "plaync 에서 캐릭터를 조회하지 못했습니다." }, { status: 502 });
  }

  if (detail.serverId !== SERVER_ID) {
    return NextResponse.json(
      { error: `${detail.serverName} 서버 캐릭터입니다. ${SERVER_NAME} 서버만 등록할 수 있습니다.` },
      { status: 400 },
    );
  }

  const admin = await isAdmin();
  const inLegion = detail.regionName === TARGET_LEGION;

  if (!inLegion && !admin) {
    return NextResponse.json(
      {
        error: detail.regionName
          ? `'${detail.regionName}' 레기온 소속입니다. ${TARGET_LEGION} 레기온만 등록할 수 있습니다.`
          : `레기온에 소속되어 있지 않습니다. ${TARGET_LEGION} 레기온만 등록할 수 있습니다.`,
        code: "NOT_IN_LEGION",
      },
      { status: 403 },
    );
  }

  try {
    const member = await (await getRepo()).upsertMember({
      character_id: canonicalCharacterId(detail.characterId),
      server_id: detail.serverId,
      server_name: detail.serverName,
      nickname: detail.nickname,
      class_name: detail.className,
      region_name: detail.regionName || null,
      level: detail.level,
      combat_power: detail.combatPower,
      item_level: detail.itemLevel,
      profile_image: detail.profileImage,
      note: typeof body.note === "string" ? body.note.slice(0, 200) : null,
      region_override: !inLegion && admin,
      available_slots: sanitizeSlots(body.slots),
    });
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "등록 실패" }, { status: 500 });
  }
}
