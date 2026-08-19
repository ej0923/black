"use client";

import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { useMemo, useState } from "react";
import { DAYS, HOURS, SLOT_HOURS, clockLabel, clockLabelEnd, toSlot } from "@/lib/constants";
import { classColor } from "@/lib/format";
import { buildSlotIndex } from "@/lib/schedule";
import type { Member } from "@/lib/types";

type Props = {
  members: Member[];
  /** 강조할 슬롯 (최적 시간대) */
  highlight?: number[];
};

/**
 * 지원자들의 가능 시간 집계표.
 * 각 칸에 그 시간에 가능한 인원수가 뜨고, 마우스를 올리면 닉네임 목록이 뜬다.
 */
export default function TimetableHeatmap({ members, highlight = [] }: Props) {
  const index = useMemo(() => buildSlotIndex(members), [members]);
  const highlighted = useMemo(() => new Set(highlight), [highlight]);

  const max = useMemo(() => {
    let m = 0;
    for (const list of index.values()) m = Math.max(m, list.length);
    return m;
  }, [index]);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[560px] grid-cols-[3.25rem_repeat(7,1fr)] gap-px">
        <div />
        {DAYS.map((label, day) => (
          <div
            key={label}
            className={`pb-2 text-center font-display text-[12px] font-bold tracking-wide ${
              day === 5 ? "text-brand" : day === 6 ? "text-[#eb8c8c]" : "text-muted"
            }`}
          >
            {label}
          </div>
        ))}

        {HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div className="pr-2 text-right font-mono text-[11px] leading-8 text-faint">{clockLabel(hour)}</div>

            {DAYS.map((_, day) => {
              const slot = toSlot(day, hour);
              const here = index.get(slot) ?? [];
              return (
                <HeatCell
                  key={slot}
                  day={day}
                  hour={hour}
                  members={here}
                  max={max}
                  highlighted={highlighted.has(slot)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatCell({
  day,
  hour,
  members,
  max,
  highlighted,
}: {
  day: number;
  hour: number;
  members: Member[];
  max: number;
  highlighted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = members.length;

  // Floating UI 가 화면 밖으로 나가면 알아서 뒤집고 밀어 넣는다.
  // 첫 줄이나 가장자리 칸에서 툴팁이 잘리던 문제가 이걸로 사라진다.
  const { refs, floatingStyles, context } = useFloating({
    open: open && count > 0,
    onOpenChange: setOpen,
    placement: "top",
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { delay: { open: 40, close: 0 }, move: false }),
    useRole(context, { role: "tooltip" }),
    useDismiss(context),
  ]);

  // 인원이 늘수록 아이온 브랜드 블루가 짙어진다
  const ratio = max === 0 ? 0 : count / max;

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className={`flex h-8 items-center justify-center border font-mono text-[12.5px] transition-colors ${
          highlighted
            ? "border-gold text-white"
            : count > 0
              ? "border-brand-ink/60 text-white"
              : "border-line/70 text-transparent"
        } ${count > 0 ? "cursor-help" : ""}`}
        style={
          count > 0
            ? { background: `color-mix(in srgb, var(--color-brand-deep) ${18 + ratio * 72}%, #0e161d)` }
            : { background: "#0e161d" }
        }
      >
        {count > 0 ? count : ""}
      </div>

      {open && count > 0 && (
        <FloatingPortal>
          <div
            // Floating UI 의 setFloating 은 ref 를 읽는 게 아니라 콜백 ref 설정자다.
            // eslint-disable-next-line react-hooks/refs
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 max-w-64 border border-line-strong bg-[#0b1218] px-2.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
          >
            <div className="mb-1.5 flex items-baseline gap-1.5 border-b border-line pb-1.5">
              <span className="font-display text-[12px] font-bold text-fg">
                {DAYS[day]} {clockLabel(hour)}:00~{clockLabelEnd(hour + SLOT_HOURS)}:00
              </span>
              <span className="tnum text-[11px] text-brand">{count}명</span>
            </div>
            <ul className="flex flex-wrap gap-x-2 gap-y-0.5">
              {members.map((m) => (
                <li key={m.id} className="whitespace-nowrap text-[12px] text-muted">
                  {m.nickname}
                  <span className={`ml-1 text-[10px] ${classColor(m.class_name)}`}>{m.class_name}</span>
                </li>
              ))}
            </ul>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
