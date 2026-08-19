import { DAYS, HOURS, SLOT_HOURS, clockLabel, clockLabelEnd, toSlot } from "./constants";
import type { Member, OverlapWindow } from "./types";

/** 슬롯 → 그 시간에 가능한 멤버 목록 */
export type SlotIndex = Map<number, Member[]>;

export function buildSlotIndex(members: Member[]): SlotIndex {
  const index: SlotIndex = new Map();
  for (const member of members) {
    for (const slot of member.available_slots ?? []) {
      const bucket = index.get(slot);
      if (bucket) bucket.push(member);
      else index.set(slot, [member]);
    }
  }
  return index;
}

export function countAt(index: SlotIndex, day: number, hour: number): number {
  return index.get(toSlot(day, hour))?.length ?? 0;
}

export function membersAt(index: SlotIndex, day: number, hour: number): Member[] {
  return index.get(toSlot(day, hour)) ?? [];
}

/**
 * 가장 많은 인원이 겹치는 구간을 찾는다.
 *
 * 같은 요일에서 최대 인원이 연속으로 이어지면 하나의 구간으로 합친다.
 * (예: 화 20시·22시 칸이 모두 5명이면 "화 20:00~24:00 5명" 한 줄)
 * 연속 구간이라도 매 시각의 참여자 조합이 다를 수 있으므로,
 * memberIds 는 구간 내내 계속 가능한 사람(교집합)만 담는다.
 */
export function findBestWindows(index: SlotIndex, minCount = 2): OverlapWindow[] {
  let max = 0;
  for (const day of DAYS.keys()) {
    for (const hour of HOURS) max = Math.max(max, countAt(index, day, hour));
  }
  if (max < minCount) return [];

  const windows: OverlapWindow[] = [];

  for (let day = 0; day < DAYS.length; day++) {
    let runStart: number | null = null;
    let runMembers: Set<string> | null = null;

    const flush = (endHour: number) => {
      if (runStart === null || runMembers === null) return;
      windows.push({
        day,
        startHour: runStart,
        endHour,
        count: max,
        memberIds: [...runMembers],
      });
      runStart = null;
      runMembers = null;
    };

    for (const hour of HOURS) {
      const here = membersAt(index, day, hour);
      if (here.length === max) {
        const ids = new Set(here.map((m) => m.id));
        if (runStart === null) {
          runStart = hour;
          runMembers = ids;
        } else {
          runMembers = new Set([...runMembers!].filter((id) => ids.has(id)));
        }
      } else {
        flush(hour);
      }
    }
    flush(HOURS[HOURS.length - 1] + SLOT_HOURS);
  }

  // 긴 구간 먼저, 같으면 이른 요일/시각 먼저
  return windows.sort(
    (a, b) => b.endHour - b.startHour - (a.endHour - a.startHour) || a.day - b.day || a.startHour - b.startHour,
  );
}

export function formatWindow(w: OverlapWindow): string {
  return `${DAYS[w.day]} ${clockLabel(w.startHour)}:00~${clockLabelEnd(w.endHour)}:00`;
}
