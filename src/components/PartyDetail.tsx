"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import TimetableHeatmap from "@/components/TimetableHeatmap";
import { SLOT_HOURS, toSlot } from "@/lib/constants";
import { classColor, formatNumber, formatPower } from "@/lib/format";
import { buildSlotIndex, findBestWindows, formatWindow } from "@/lib/schedule";
import type { Member, OverlapWindow, Party } from "@/lib/types";

type Props = {
  party: Party;
  applicants: Member[];
  allMembers: Member[];
};

export default function PartyDetail({ party, applicants, allMembers }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const index = useMemo(() => buildSlotIndex(applicants), [applicants]);
  const windows = useMemo(() => findBestWindows(index), [index]);

  const highlight = useMemo(() => {
    const slots: number[] = [];
    for (const w of windows) {
      for (let h = w.startHour; h < w.endHour; h += SLOT_HOURS) slots.push(toSlot(w.day, h));
    }
    return slots;
  }, [windows]);

  const memberById = useMemo(() => new Map(applicants.map((m) => [m.id, m])), [applicants]);

  async function call(run: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const res = await run();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "요청에 실패했습니다.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const noSchedule = applicants.filter((m) => (m.available_slots?.length ?? 0) === 0);
  const best = windows[0];

  return (
    <div className="space-y-5">
      {/* ── 지원 ───────────────────────────────────────────── */}
      <ApplyBox
        party={party}
        allMembers={allMembers}
        appliedIds={new Set(applicants.map((m) => m.id))}
        busy={busy}
        onApply={(memberId) =>
          call(() =>
            fetch("/api/applications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ partyId: party.id, memberId }),
            }),
          )
        }
      />

      {error && (
        <div className="border-l-2 border-crimson bg-crimson/10 px-3 py-2 text-[13px] text-[#f0a0a0]">{error}</div>
      )}

      {/* ── 겹치는 시간대 — 캐릭터 정보실 배너와 같은 그라디언트 ────── */}
      <section className="card overflow-hidden">
        <div className="border-b border-line bg-[linear-gradient(90deg,#213140,#344859_55%,#243544)] px-5 py-5">
          <p className="label mb-2">겹치는 시간대</p>

          {!best ? (
            <p className="font-display text-[19px] text-muted">
              {applicants.length === 0
                ? "아직 지원자가 없습니다."
                : applicants.length === 1
                  ? "지원자가 1명이라 겹치는 시간을 계산할 수 없습니다."
                  : "두 명 이상 겹치는 시간이 없습니다."}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-display text-[30px] font-bold leading-none tracking-[-0.02em] text-gold">
                  {formatWindow(best)}
                </span>
                <span className="tnum font-display text-[17px] font-bold text-white">
                  {best.count}
                  <span className="ml-0.5 text-[13px] font-medium text-white/55">/ {applicants.length}명</span>
                </span>
              </div>

              <WindowMembers win={best} memberById={memberById} />

              {windows.length > 1 && (
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-white/10 pt-2.5">
                  <span className="label">같은 인원 다른 시간</span>
                  {windows.slice(1, 6).map((w, i) => (
                    <span key={`${w.day}-${w.startHour}-${i}`} className="text-[12.5px] text-gold/75">
                      {formatWindow(w)}
                    </span>
                  ))}
                  {windows.length > 6 && <span className="text-[12px] text-white/35">+{windows.length - 6}</span>}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── 타임테이블 ──────────────────────────────────────── */}
        <div className="px-5 py-5">
          <TimetableHeatmap members={applicants} highlight={highlight} />
          <p className="mt-3 text-[11.5px] text-faint">
            숫자는 그 시간에 가능한 인원입니다. 칸에 마우스를 올리면 누구인지 보입니다.
            {noSchedule.length > 0 && (
              <>
                {" · "}
                <span className="text-gold/70">
                  가능 시간 미등록 {noSchedule.map((m) => m.nickname).join(", ")}
                </span>
              </>
            )}
          </p>
        </div>
      </section>

      {/* ── 지원자 ─────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="thead">
          <span className="eyebrow">
            지원자 <span className="tnum text-fg">{applicants.length}</span>
          </span>
        </div>

        {applicants.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-dim">아직 아무도 지원하지 않았습니다.</p>
        ) : (
          <ul>
            {applicants.map((m, i) => (
              <li key={m.id} className="row flex flex-wrap items-center gap-x-4 gap-y-1 px-3.5 py-2.5">
                <span className="tnum w-5 shrink-0 text-right font-mono text-[11px] text-faint">{i + 1}</span>
                {m.profile_image ? (
                  <img
                    src={m.profile_image}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full border border-line-strong object-cover"
                  />
                ) : (
                  <div className="h-7 w-7 shrink-0 rounded-full border border-line-strong bg-raised" />
                )}
                <span className="text-[14px] font-semibold text-fg">{m.nickname}</span>
                <span className={`text-[11.5px] font-medium ${classColor(m.class_name)}`}>{m.class_name}</span>
                <span
                  className="tnum ml-auto font-display text-[14px] font-bold text-fg"
                  title={formatNumber(m.combat_power)}
                >
                  {formatPower(m.combat_power)}
                </span>
                <span className="tnum w-16 text-right font-mono text-[12px] text-muted">
                  {formatNumber(m.item_level)}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    call(() => fetch(`/api/applications?partyId=${party.id}&memberId=${m.id}`, { method: "DELETE" }))
                  }
                  className="btn btn-ghost btn-sm"
                >
                  지원 취소
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** 최적 구간 내내 계속 가능한 사람들 */
function WindowMembers({ win, memberById }: { win: OverlapWindow; memberById: Map<string, Member> }) {
  const names = win.memberIds.map((id) => memberById.get(id)).filter((m): m is Member => Boolean(m));
  if (names.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="label mr-0.5">이 구간 내내 가능</span>
      {names.map((m) => (
        <span key={m.id} className="tag border border-gold/35 bg-gold/12 text-[11.5px] text-[#f2d49a]">
          {m.nickname}
        </span>
      ))}
    </div>
  );
}

/** 등록된 멤버 중 자기 이름을 검색해서 지원한다. */
function ApplyBox({
  party,
  allMembers,
  appliedIds,
  busy,
  onApply,
}: {
  party: Party;
  allMembers: Member[];
  appliedIds: Set<string>;
  busy: boolean;
  onApply: (memberId: string) => void;
}) {
  const [query, setQuery] = useState("");

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allMembers.filter((m) => m.nickname.toLowerCase().includes(q)).slice(0, 8);
  }, [query, allMembers]);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">파티 {party.code} 지원</p>
        <p className="text-[12px] text-faint">여러 파티에 중복 지원할 수 있습니다</p>
      </div>

      <input
        className="input mt-3 max-w-md"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="명단에서 본인 닉네임 검색"
        aria-label="지원할 멤버 검색"
      />

      {query.trim() && hits.length === 0 && (
        <p className="mt-2 text-[12.5px] text-dim">명단에 없는 닉네임입니다. 먼저 멤버 등록을 해주세요.</p>
      )}

      {hits.length > 0 && (
        <ul className="mt-2 max-w-md border border-line">
          {hits.map((m) => {
            const already = appliedIds.has(m.id);
            return (
              <li key={m.id} className="row flex items-center gap-2.5 px-3 py-2">
                <span className="text-[13.5px] font-semibold text-fg">{m.nickname}</span>
                <span className={`text-[11.5px] ${classColor(m.class_name)}`}>{m.class_name}</span>
                <span className="tnum font-mono text-[11.5px] text-faint">{formatPower(m.combat_power)}</span>
                {(m.available_slots?.length ?? 0) === 0 && (
                  <span className="tag bg-gold/15 text-gold">시간 미등록</span>
                )}
                <button
                  type="button"
                  disabled={busy || already}
                  onClick={() => {
                    onApply(m.id);
                    setQuery("");
                  }}
                  className={`btn btn-sm ml-auto ${already ? "btn-ghost" : "btn-primary"}`}
                >
                  {already ? "지원함" : "지원"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
