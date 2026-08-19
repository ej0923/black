"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import TimetableEditor from "@/components/TimetableEditor";
import { TARGET_LEGION, slotLabel } from "@/lib/constants";
import { classColor, formatNumber, formatPower, formatRelative } from "@/lib/format";
import type { Member, Party } from "@/lib/types";

type Props = {
  members: Member[];
  parties: Party[];
  applications: { party_id: string; member_id: string }[];
  admin: boolean;
};

type SortKey = "combat_power" | "item_level" | "nickname" | "slots";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "combat_power", label: "전투력순" },
  { key: "item_level", label: "아이템레벨순" },
  { key: "slots", label: "가능시간순" },
  { key: "nickname", label: "가나다순" },
];

export default function MemberList({ members, parties, applications, admin }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("combat_power");
  const [classFilter, setClassFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const partyById = useMemo(() => new Map(parties.map((p) => [p.id, p])), [parties]);

  const appliedByMember = useMemo(() => {
    const map = new Map<string, Party[]>();
    for (const app of applications) {
      const party = partyById.get(app.party_id);
      if (!party) continue;
      const list = map.get(app.member_id);
      if (list) list.push(party);
      else map.set(app.member_id, [party]);
    }
    return map;
  }, [applications, partyById]);

  /** 직업 버튼용. 명단에 실제로 있는 직업만, 인원수와 함께. */
  const classes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members) {
      if (!m.class_name) continue;
      counts.set(m.class_name, (counts.get(m.class_name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  }, [members]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = members.filter(
      (m) => (!q || m.nickname.toLowerCase().includes(q)) && (!classFilter || m.class_name === classFilter),
    );

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "nickname":
          return a.nickname.localeCompare(b.nickname, "ko");
        case "item_level":
          return (b.item_level ?? 0) - (a.item_level ?? 0);
        case "slots":
          return (b.available_slots?.length ?? 0) - (a.available_slots?.length ?? 0);
        default:
          return (b.combat_power ?? 0) - (a.combat_power ?? 0);
      }
    });
  }, [members, query, classFilter, sort]);

  async function call(id: string, run: () => Promise<Response>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await run();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "요청에 실패했습니다.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* 직업 필터 — 공대 직업 구성이 한눈에 보이도록 인원수를 붙인다 */}
      {classes.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-line">
          <button
            type="button"
            onClick={() => setClassFilter("")}
            data-on={classFilter === ""}
            className="tab mr-2"
          >
            전체 <span className="tnum ml-0.5 text-[11px] text-faint">{members.length}</span>
          </button>

          {classes.map(([name, count]) => {
            const on = classFilter === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setClassFilter(on ? "" : name)}
                data-on={on}
                className={`tab mr-2 ${on ? classColor(name) : ""}`}
              >
                {name}
                <span className="tnum ml-0.5 text-[11px] text-faint">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="input h-8 max-w-52 flex-1 text-[13px]"
          placeholder="닉네임 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input h-8 w-auto text-[13px]"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="정렬"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="tnum ml-auto text-xs text-faint">
          {visible.length}
          {visible.length !== members.length && <span className="text-line-strong"> / {members.length}</span>}명
        </span>
      </div>

      {error && (
        <div className="mb-3 border-l-2 border-crimson bg-crimson/10 px-3 py-2 text-[13px] text-[#f0a0a0]">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <p className="text-[13px] text-dim">
            {members.length === 0 ? "등록된 멤버가 없습니다." : "조건에 맞는 멤버가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="thead label hidden lg:flex">
            <span className="w-[240px] shrink-0">캐릭터</span>
            <span className="w-20 text-right">전투력</span>
            <span className="w-20 text-right">아이템</span>
            <span className="flex-1">가능 시간</span>
            <span className="w-[190px] shrink-0 text-right">갱신</span>
          </div>

          <ul>
            {visible.map((m) => {
              const applied = appliedByMember.get(m.id) ?? [];
              const outOfLegion = m.region_name !== TARGET_LEGION;
              const open = openId === m.id;

              return (
                <li key={m.id} className="row">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-2.5">
                    {/* 캐릭터 */}
                    <div className="flex w-[240px] min-w-0 shrink-0 items-center gap-2.5">
                      {m.profile_image ? (
                        <img
                          src={m.profile_image}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full border border-line-strong object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 shrink-0 rounded-full border border-line-strong bg-raised" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <a
                            href={`https://aion2tool.com/char/serverid=${m.server_id}/${encodeURIComponent(m.nickname)}`}
                            target="_blank"
                            rel="noreferrer"
                            title={`${m.nickname} 상세 정보 (aion2tool.com)`}
                            className="truncate text-[14px] font-semibold text-fg underline-offset-2 transition-colors hover:text-brand hover:underline"
                          >
                            {m.nickname}
                          </a>
                          <span className={`shrink-0 text-[11.5px] font-medium ${classColor(m.class_name)}`}>
                            {m.class_name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          <span className="tnum text-[11px] text-faint">Lv.{m.level ?? "-"}</span>
                          {outOfLegion && (
                            <span className="tag bg-crimson/15 text-[#eb8c8c]">{m.region_name || "무소속"}</span>
                          )}
                          {m.region_override && <span className="tag bg-gold/15 text-gold">예외</span>}
                          {applied.map((p) => (
                            <span key={p.id} className="tag bg-brand/15 text-brand">
                              {p.code}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 수치 */}
                    <div className="tnum w-20 shrink-0 text-right font-display text-[15px] font-bold text-fg" title={formatNumber(m.combat_power)}>
                      {formatPower(m.combat_power)}
                    </div>
                    <div className="tnum w-20 shrink-0 text-right font-mono text-[13px] text-muted">
                      {formatNumber(m.item_level)}
                    </div>

                    {/* 가능 시간 */}
                    <div className="min-w-40 flex-1">
                      <SlotSummary slots={m.available_slots ?? []} />
                    </div>

                    {/* 조작 */}
                    <div className="ml-auto flex shrink-0 items-center gap-1.5">
                      <span className="hidden w-16 text-right text-[11px] text-faint xl:inline">
                        {formatRelative(m.synced_at)}
                      </span>
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => call(m.id, () => fetch(`/api/members/${m.id}/refresh`, { method: "POST" }))}
                        className="btn btn-ghost btn-sm"
                        title="plaync 에서 전투력·아이템레벨을 다시 읽어옵니다"
                      >
                        {busyId === m.id ? "…" : "갱신"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : m.id)}
                        data-on={open}
                        className="btn btn-ghost btn-sm data-[on=true]:border-brand data-[on=true]:text-brand"
                      >
                        {open ? "닫기" : "시간 수정"}
                      </button>
                      {admin && (
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          onClick={() => {
                            if (!confirm(`${m.nickname} 을(를) 명단에서 삭제할까요? 지원 내역도 함께 사라집니다.`)) return;
                            call(m.id, () => fetch(`/api/members/${m.id}`, { method: "DELETE" }));
                          }}
                          className="btn btn-danger btn-sm"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>

                  {open && (
                    <MemberScheduleEditor
                      member={m}
                      onSaved={() => {
                        setOpenId(null);
                        router.refresh();
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 가능한 시간을 "월 18시, 토 22시" 처럼 요일 + 시작시각으로 나열한다. */
function SlotSummary({ slots }: { slots: number[] }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 8;

  if (slots.length === 0) {
    return <span className="text-[11.5px] text-gold/70">가능 시간 미등록</span>;
  }

  const shown = expanded ? slots : slots.slice(0, LIMIT);
  const hidden = slots.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((slot) => (
        <span key={slot} className="tag bg-raised font-mono text-[10.5px] text-muted">
          {slotLabel(slot)}
        </span>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="tnum px-1 text-[11px] text-brand/80 transition-colors hover:text-brand"
        >
          +{hidden}
        </button>
      )}
      {expanded && slots.length > LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="px-1 text-[11px] text-faint transition-colors hover:text-muted"
        >
          접기
        </button>
      )}
    </div>
  );
}

function MemberScheduleEditor({ member, onSaved }: { member: Member; onSaved: () => void }) {
  const [slots, setSlots] = useState<number[]>(member.available_slots ?? []);
  const [note, setNote] = useState(member.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots, note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "저장에 실패했습니다.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-line bg-[#0d151c] px-3.5 py-4">
      <p className="eyebrow mb-3">{member.nickname} · 가능한 시간</p>
      <TimetableEditor value={slots} onChange={setSlots} />

      <label className="mt-4 block max-w-lg">
        <span className="label">메모</span>
        <input
          className="input mt-1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="예) 금요일은 늦게 접속"
        />
      </label>

      {error && <p className="mt-2 text-xs text-[#f0a0a0]">{error}</p>}

      <button type="button" onClick={save} disabled={busy} className="btn btn-primary mt-4">
        {busy ? "저장 중…" : "저장"}
      </button>
    </div>
  );
}
