"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DAYS, HOURS, SLOT_HOURS, clockLabel, clockLabelEnd, toSlot } from "@/lib/constants";

type Props = {
  value: number[];
  onChange: (slots: number[]) => void;
};

/**
 * 가능 시간 체크용 타임테이블. 클릭 후 드래그하면 연속으로 칠해진다.
 * 드래그 시작 칸의 상태를 뒤집어서 그 값을 지나가는 칸에 그대로 적용한다.
 */
export default function TimetableEditor({ value, onChange }: Props) {
  const selected = new Set(value);
  const dragValue = useRef<boolean | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const stop = () => {
      dragValue.current = null;
      setDragging(false);
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging]);

  const apply = useCallback(
    (slot: number, on: boolean) => {
      const has = value.includes(slot);
      if (on === has) return; // 같은 칸을 계속 지나가도 매번 리렌더하지 않도록
      const next = on ? [...value, slot] : value.filter((s) => s !== slot);
      onChange(next.sort((a, b) => a - b));
    },
    [value, onChange],
  );

  const toggleMany = (slotsToToggle: number[]) => {
    const allOn = slotsToToggle.every((s) => selected.has(s));
    const next = new Set(value);
    for (const s of slotsToToggle) {
      if (allOn) next.delete(s);
      else next.add(s);
    }
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <div className="select-none">
      <p className="mb-2.5 text-[12.5px] text-dim">시간 혹은 요일을 누르면 해당 행/렬이 전체 선택됩니다.</p>

      <div className="overflow-x-auto">
        <div className="grid min-w-[520px] grid-cols-[3.25rem_repeat(7,1fr)] gap-px">
          <div />
          {DAYS.map((label, day) => (
            <button
              key={label}
              type="button"
              onClick={() => toggleMany(HOURS.map((h) => toSlot(day, h)))}
              className={`pb-2 text-center font-display text-[12px] font-bold tracking-wide transition-colors hover:text-fg ${
                day === 5 ? "text-brand" : day === 6 ? "text-[#eb8c8c]" : "text-muted"
              }`}
              title={`${label}요일 전체 토글`}
            >
              {label}
            </button>
          ))}

          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <button
                type="button"
                onClick={() => toggleMany(DAYS.map((_, d) => toSlot(d, hour)))}
                className="pr-2 text-right font-mono text-[11px] leading-8 text-faint transition-colors hover:text-fg"
                title={`${clockLabel(hour)}:00~${clockLabelEnd(hour + SLOT_HOURS)}:00 전체 토글`}
              >
                {clockLabel(hour)}
              </button>

              {DAYS.map((_, day) => {
                const slot = toSlot(day, hour);
                const on = selected.has(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      dragValue.current = !on;
                      setDragging(true);
                      apply(slot, !on);
                    }}
                    onPointerEnter={() => {
                      if (dragValue.current !== null) apply(slot, dragValue.current);
                    }}
                    className={`h-8 border transition-colors ${
                      on
                        ? "border-[#2b7fc8] bg-brand-deep"
                        : "border-line/70 bg-[#0e161d] hover:border-line-strong hover:bg-raised"
                    }`}
                    aria-pressed={on}
                    aria-label={`${DAYS[day]} ${clockLabel(hour)}:00~${clockLabelEnd(hour + SLOT_HOURS)}:00`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-faint">
        <span>한 칸은 2시간입니다. 드래그하면 연속으로 칠할 수 있습니다.</span>
        <span className="tnum ml-auto text-brand">{value.length}칸 선택됨</span>
        <button type="button" onClick={() => onChange([])} className="transition-colors hover:text-muted">
          전체 해제
        </button>
      </div>
    </div>
  );
}
