import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { TARGET_LEGION } from "@/lib/constants";
import { getRepo } from "@/lib/db";
import { getCharacterDetail } from "@/lib/plaync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * plaync 에서 전투력 / 아이템레벨 / 직업 / 레기온을 다시 읽어온다.
 * 자동 동기화는 없고 이 버튼을 눌렀을 때만 갱신된다.
 */
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const repo = await getRepo();

  const member = await repo.getMember(id).catch(() => null);
  if (!member) return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });

  if (member.character_id.startsWith("local:")) {
    return NextResponse.json(
      { error: "샘플 데이터라 plaync 에서 갱신할 수 없습니다." },
      { status: 400 },
    );
  }

  let detail;
  try {
    detail = await getCharacterDetail(member.character_id);
  } catch {
    return NextResponse.json({ error: "plaync 조회에 실패했습니다. 잠시 후 다시 시도하세요." }, { status: 502 });
  }

  // 갱신 결과 레기온을 벗어났더라도 여기서 바로 지우지는 않는다.
  // 명단에서 배지로 드러내고 처리는 관리자에게 맡긴다.
  const stillIn = detail.regionName === TARGET_LEGION;
  const admin = await isAdmin();

  try {
    const updated = await repo.updateMember(id, {
      nickname: detail.nickname,
      class_name: detail.className,
      region_name: detail.regionName || null,
      level: detail.level,
      combat_power: detail.combatPower,
      item_level: detail.itemLevel,
      profile_image: detail.profileImage,
      region_override: stillIn ? false : member.region_override || admin,
      synced_at: new Date().toISOString(),
    });
    return NextResponse.json({ member: updated, inLegion: stillIn });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "갱신 실패" }, { status: 500 });
  }
}
