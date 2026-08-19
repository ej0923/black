/** 603954 → "603.9K" (plaync 캐릭터 정보실과 같은 표기) */
export function formatPower(value: number | null | undefined): string {
  if (value == null) return "-";
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(1)}K`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString("ko-KR");
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}

/** "2026-08-19T…" → "2026.08.19". 게시판 목록처럼 날짜가 그대로 보여야 하는 곳에 쓴다. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/**
 * 직업별 색상. 아이온2 사이트에서 추출한 팔레트 안에서만 골라
 * 화면 전체가 한 벌로 보이게 한다.
 */
export const CLASS_COLORS: Record<string, string> = {
  검성: "text-[#e58370]", // 전사 — 붉은 계열
  수호성: "text-[#e9a43a]", // 탱커 — 금색
  살성: "text-[#c07ad6]", // 정찰 — 자주
  궁성: "text-[#8fc871]", // 정찰 — 연둣빛
  마도성: "text-[#a36ce6]", // 정령 — 보라
  정령성: "text-[#34b798]", // 정령 — 청록
  치유성: "text-[#6fb8e8]", // 사제 — 하늘
  호법성: "text-[#09ce9f]", // 사제 — 민트
  권성: "text-[#ee8c4a]", // 전사 — 주황
};

export function classColor(className: string | null | undefined): string {
  return (className && CLASS_COLORS[className]) || "text-dim";
}
