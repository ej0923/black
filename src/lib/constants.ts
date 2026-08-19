/**
 * 이 서비스가 관리하는 레기온과 그 레기온이 있는 서버.
 *
 * plaync 는 레기온명으로 서버를 역조회하는 API 를 주지 않는다. 검색은 언제나
 * (serverId, race) 로 좁혀 부르고, 레기온은 캐릭터 상세의 regionName 으로만
 * 확인할 수 있다. 그래서 아래 넷은 세트로 맞춰야 한다 — 레기온이 다른 서버로
 * 옮겨가면 SERVER_ID / SERVER_NAME / RACE_ID / RACE_NAME 도 같이 고쳐야 한다.
 *
 * serverId 1001~1021 = 천족(race 1), 2001~2021 = 마족(race 2).
 */
export const SERVER_ID = 1001;
export const SERVER_NAME = "시엘";
export const RACE_ID = 1;
export const RACE_NAME = "천족";

export const TARGET_LEGION = "블랙";

/** 요일: 0 = 월 ... 6 = 일 */
export const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** 한 칸이 덮는 시간 (시간 단위) */
export const SLOT_HOURS = 2;

/** 타임테이블 각 칸의 시작 시각. 00:00 ~ 24:00 을 2시간 단위 12칸으로 나눈다. */
export const HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;

export const SLOT_COUNT = DAYS.length * HOURS.length;

/** (요일, 시각) → 슬롯 정수. DB의 available_slots 에 저장되는 값. */
export function toSlot(day: number, hour: number): number {
  return day * 24 + hour;
}

export function fromSlot(slot: number): { day: number; hour: number } {
  return { day: Math.floor(slot / 24), hour: slot % 24 };
}

/** 0 → "00", 22 → "22" */
export function clockLabel(hour: number): string {
  return String(hour).padStart(2, "0");
}

/** 구간의 끝 시각. 하루의 마지막 칸은 "00" 이 아니라 "24" 로 읽히는 편이 낫다. */
export function clockLabelEnd(hour: number): string {
  return clockLabel(hour === 0 ? 24 : hour);
}

/** 슬롯 하나를 "화 20:00~22:00" 형태로 */
export function slotRangeLabel(day: number, hour: number): string {
  return `${DAYS[day]} ${clockLabel(hour)}:00~${clockLabelEnd(hour + SLOT_HOURS)}:00`;
}

/** 명단에 나열할 짧은 표기. 슬롯 하나를 "월 18시" 형태로 */
export function slotLabel(slot: number): string {
  const { day, hour } = fromSlot(slot);
  return `${DAYS[day]} ${hour}시`;
}

export function isValidSlot(slot: unknown): slot is number {
  if (typeof slot !== "number" || !Number.isInteger(slot)) return false;
  const { day, hour } = fromSlot(slot);
  return day >= 0 && day < DAYS.length && (HOURS as readonly number[]).includes(hour);
}

/** 클라이언트가 보낸 슬롯 배열을 신뢰하지 않고 걸러낸다. */
export function sanitizeSlots(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter(isValidSlot))].sort((a, b) => a - b);
}
