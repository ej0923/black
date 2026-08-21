/**
 * plaync 아이온2 캐릭터 정보실 공개 API 클라이언트.
 *
 * 인증 없이 same-origin 으로 열려 있는 엔드포인트를 서버 사이드에서 호출한다.
 * (브라우저에서 직접 부르면 CORS 로 막히므로 반드시 라우트 핸들러 경유)
 *
 *   GET /api/gameinfo/servers        서버 목록
 *   GET /api/gameinfo/classes        직업 목록
 *   GET /api/gameinfo/pcdata         pcId → 직업 매핑
 *   GET /api/search/character        닉 검색 (keyword + serverId + race 필수)
 *   GET /api/character/info          상세 (전투력 / 아이템레벨 / 레기온)
 */
import { RACE_ID, SERVER_ID } from "./constants";

const BASE = "https://aion2.plaync.com";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Referer: `${BASE}/ko-kr/characters/index`,
};

export class PlayncError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function getJson<T>(path: string, revalidate = 0): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: HEADERS,
    next: revalidate > 0 ? { revalidate } : undefined,
    cache: revalidate > 0 ? undefined : "no-store",
  });
  if (!res.ok) {
    throw new PlayncError(`plaync 응답 오류 (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

/**
 * characterId 는 검색 응답에서 이미 `%3D` 로 부분 인코딩된 채로 온다.
 * 통째로 encodeURIComponent 하면 `%` 가 `%25` 로 이중 인코딩되어 404 가 난다.
 * 그래서 디코딩된 원본을 보관하고, 요청 시 예약문자만 직접 치환한다.
 */
export function canonicalCharacterId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function encodeCharacterId(id: string): string {
  return id.replace(/[%+/=&#?]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

// ---------------------------------------------------------------- 게임 상수

type PcDataRow = { className: string; classText: string; genderName: string; id: number; raceName: string };

let pcDataCache: { map: Map<number, string>; at: number } | null = null;

/** pcId(외형 id) → 직업 한글명 */
export async function getPcClassMap(): Promise<Map<number, string>> {
  const HOUR = 60 * 60 * 1000;
  if (pcDataCache && Date.now() - pcDataCache.at < 12 * HOUR) return pcDataCache.map;

  const data = await getJson<{ pcDataList: PcDataRow[] }>("/api/gameinfo/pcdata?lang=ko", 43200);
  const map = new Map<number, string>();
  for (const row of data.pcDataList) map.set(row.id, row.classText);
  pcDataCache = { map, at: Date.now() };
  return map;
}

// ---------------------------------------------------------------- 검색

export type SearchHit = {
  characterId: string;
  name: string;
  level: number;
  pcId: number;
  className: string;
  serverId: number;
  serverName: string;
  profileImageUrl: string | null;
};

type RawSearchResponse = {
  list: {
    characterId: string;
    name: string;
    race: number;
    pcId: number;
    level: number;
    serverId: number;
    serverName: string;
    profileImageUrl: string;
  }[];
  pagination: { page: number; size: number; total: number; endPage: number };
};

/** 검색 결과의 name 에는 매칭 구간이 <strong> 으로 감싸여 온다. */
function stripHighlight(name: string): string {
  return name.replace(/<\/?strong>/g, "");
}

export async function searchCharacters(keyword: string, size = 20): Promise<SearchHit[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  const qs = new URLSearchParams({
    keyword: trimmed,
    serverId: String(SERVER_ID),
    race: String(RACE_ID),
    page: "1",
    size: String(size),
  });

  const [data, pcMap] = await Promise.all([
    getJson<RawSearchResponse>(`/api/search/character?${qs}`),
    getPcClassMap().catch(() => new Map<number, string>()),
  ]);

  return (data.list ?? []).map((hit) => ({
    characterId: canonicalCharacterId(hit.characterId),
    name: stripHighlight(hit.name),
    level: hit.level,
    pcId: hit.pcId,
    className: pcMap.get(hit.pcId) ?? "",
    serverId: hit.serverId,
    serverName: hit.serverName,
    profileImageUrl: hit.profileImageUrl || null,
  }));
}

// ---------------------------------------------------------------- 상세

export type CharacterDetail = {
  characterId: string;
  nickname: string;
  className: string;
  regionName: string;
  level: number;
  combatPower: number;
  itemLevel: number;
  serverId: number;
  serverName: string;
  raceName: string;
  titleName: string | null;
  profileImage: string | null;
};

type RawInfoResponse = {
  profile: {
    characterId: string;
    characterLevel: number;
    characterName: string;
    className: string;
    combatPower: number;
    profileImage: string;
    raceName: string;
    regionName: string;
    serverId: number;
    serverName: string;
    titleName: string | null;
  };
  stat: { statList: { name: string; type: string; value: number }[] };
};

export async function getCharacterDetail(characterId: string): Promise<CharacterDetail> {
  const canonical = canonicalCharacterId(characterId);
  const qs = `lang=ko&serverId=${SERVER_ID}&characterId=${encodeCharacterId(canonical)}`;
  const data = await getJson<RawInfoResponse>(`/api/character/info?${qs}`);

  const p = data.profile;
  const itemLevel = data.stat?.statList?.find((s) => s.type === "ItemLevel")?.value ?? 0;

  return {
    characterId: p.characterId, // 상세 응답은 디코딩된 형태로 돌려준다
    nickname: p.characterName,
    className: p.className,
    regionName: p.regionName ?? "",
    level: p.characterLevel,
    combatPower: p.combatPower,
    itemLevel,
    serverId: p.serverId,
    serverName: p.serverName,
    raceName: p.raceName,
    titleName: p.titleName || null,
    profileImage: p.profileImage || null,
  };
}
