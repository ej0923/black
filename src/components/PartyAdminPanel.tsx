"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Party } from "@/lib/types";

/** 관리자 전용: 파티 추가 / 이름·메모 수정 / 삭제 */
export default function PartyAdminPanel({ parties }: { parties: Party[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "요청에 실패했습니다.");
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const nextCode = () => {
    const used = new Set(parties.map((p) => p.code.toUpperCase()));
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode(65 + i);
      if (!used.has(c)) return c;
    }
    return `P${parties.length + 1}`;
  };

  return (
    <section className="mb-5 border border-gold/25 bg-gold/[0.05]">
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-[12.5px] font-semibold text-gold">관리자 · 파티 관리</span>
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            if (!open && !code) setCode(nextCode());
          }}
          className="btn btn-ghost btn-sm"
        >
          {open ? "닫기" : "파티 추가 / 편집"}
        </button>
      </div>

      {error && <p className="px-4 pb-2 text-[12px] text-[#f0a0a0]">{error}</p>}

      {open && (
        <div className="space-y-4 border-t border-gold/20 px-4 py-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="w-16">
              <span className="label">코드</span>
              <input className="input mt-1" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} />
            </label>
            <label className="min-w-36 flex-1">
              <span className="label">이름</span>
              <input
                className="input mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) 새벽공대"
                maxLength={50}
              />
            </label>
            <label className="min-w-48 flex-[2]">
              <span className="label">메모</span>
              <input
                className="input mt-1"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예) 아이템레벨 4500 이상"
                maxLength={200}
              />
            </label>
            <button
              type="button"
              disabled={busy || !code.trim()}
              onClick={async () => {
                const ok = await run(() =>
                  fetch("/api/parties", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code, name, memo }),
                  }),
                );
                if (ok) {
                  setName("");
                  setMemo("");
                  setCode("");
                }
              }}
              className="btn btn-primary"
            >
              추가
            </button>
          </div>

          {parties.length > 0 && (
            <ul className="border border-line bg-surface">
              {parties.map((p) => (
                <PartyRow key={p.id} party={p} busy={busy} run={run} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function PartyRow({
  party,
  busy,
  run,
}: {
  party: Party;
  busy: boolean;
  run: (fn: () => Promise<Response>) => Promise<boolean>;
}) {
  const [name, setName] = useState(party.name ?? "");
  const [memo, setMemo] = useState(party.memo ?? "");
  const dirty = name !== (party.name ?? "") || memo !== (party.memo ?? "");

  return (
    <li className="row flex flex-wrap items-center gap-2 px-3 py-2">
      <span className="w-7 font-display text-[16px] font-bold text-brand">{party.code}</span>
      <input
        className="input h-8 min-w-28 flex-1 text-[13px]"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름"
        maxLength={50}
      />
      <input
        className="input h-8 min-w-40 flex-[2] text-[13px]"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모"
        maxLength={200}
      />
      <button
        type="button"
        disabled={busy || !dirty}
        onClick={() =>
          run(() =>
            fetch(`/api/parties/${party.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, memo }),
            }),
          )
        }
        className="btn btn-ghost btn-sm"
      >
        저장
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!confirm(`파티 ${party.code} 를 삭제할까요? 지원 내역도 함께 사라집니다.`)) return;
          run(() => fetch(`/api/parties/${party.id}`, { method: "DELETE" }));
        }}
        className="btn btn-danger btn-sm"
      >
        삭제
      </button>
    </li>
  );
}
