"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CharacterPicker, { type SearchHit } from "@/components/CharacterPicker";
import TimetableEditor from "@/components/TimetableEditor";
import { TARGET_LEGION } from "@/lib/constants";
import { classColor, formatNumber, formatPower } from "@/lib/format";

type Detail = {
  characterId: string;
  nickname: string;
  className: string;
  regionName: string;
  level: number;
  combatPower: number;
  itemLevel: number;
  serverName: string;
  raceName: string;
  titleName: string | null;
  profileImage: string | null;
};

type Step = "search" | "verify" | "done";

const STEPS = ["캐릭터 검색", "정보 확인", "가능 시간"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("search");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [inLegion, setInLegion] = useState(false);
  const [slots, setSlots] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(hit: SearchHit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/plaync/character?characterId=${encodeURIComponent(hit.characterId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "캐릭터 조회에 실패했습니다.");
      setDetail(json.character);
      setInLegion(json.inLegion);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "캐릭터 조회에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: detail.characterId, slots, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "등록에 실패했습니다.");
      setStep("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done" && detail) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="label">등록 완료</p>
        <h1 className="mt-2 font-display text-[24px] font-bold text-fg">{detail.nickname}</h1>
        <p className="mt-2 text-[13px] text-dim">
          가능 시간 {slots.length}칸이 저장되었습니다. 이제 파티에 지원할 수 있습니다.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/parties" className="btn btn-primary">
            파티 지원하러 가기
          </Link>
          <Link href="/roster" className="btn btn-ghost">
            멤버목록
          </Link>
        </div>
      </div>
    );
  }

  const activeStep = step === "search" ? 0 : 1;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 border-b border-line pb-5">
        <p className="eyebrow mb-1.5">Register</p>
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-fg">멤버등록</h1>
        <p className="mt-1.5 text-[13px] text-dim">
          닉네임을 검색하면 직업 · 전투력 · 아이템레벨이 plaync 에서 자동으로 채워지고, {TARGET_LEGION} 레기온 소속인지
          확인합니다.
        </p>
      </div>

      <ol className="mb-5 flex items-center gap-5 text-[12.5px]">
        {STEPS.map((label, i) => {
          const done = i < activeStep;
          const on = i === activeStep || (i === 2 && activeStep === 1);
          return (
            <li key={label} className="flex items-center gap-1.5">
              <span
                className={`tnum flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[11px] ${
                  done
                    ? "border-brand bg-brand text-white"
                    : on
                      ? "border-brand text-brand"
                      : "border-line-strong text-faint"
                }`}
              >
                {i + 1}
              </span>
              <span className={on || done ? "font-semibold text-fg" : "text-faint"}>{label}</span>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mb-4 border-l-2 border-crimson bg-crimson/10 px-3 py-2.5 text-[13px] text-[#f0a0a0]">
          {error}
        </div>
      )}

      {step === "search" && (
        <section className="card p-5">
          <CharacterPicker onPick={pick} autoFocus />
          {busy && <p className="mt-3 text-[12.5px] text-brand">캐릭터 정보를 불러오는 중…</p>}
        </section>
      )}

      {step === "verify" && detail && (
        <>
          <section className="card overflow-hidden">
            {/* 캐릭터 정보실의 프로필 배너를 그대로 옮긴 구성 */}
            <div className="flex flex-wrap items-center gap-5 bg-[linear-gradient(90deg,#213140,#344859_55%,#243544)] px-5 py-5">
              {detail.profileImage && (
                <img
                  src={detail.profileImage}
                  alt=""
                  className="h-16 w-16 rounded-full border-2 border-white/15 object-cover"
                />
              )}
              <div className="min-w-0">
                {detail.titleName && <div className="text-[11.5px] text-white/45">[{detail.titleName}]</div>}
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-[22px] font-bold leading-tight text-white">
                    {detail.nickname}
                  </span>
                  <span className={`text-[13px] font-medium ${classColor(detail.className)}`}>
                    {detail.className}
                  </span>
                  <span className="tnum font-mono text-[12px] text-white/40">Lv.{detail.level}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-white/55">
                  <span>{detail.serverName}</span>
                  <span className="text-white/20">|</span>
                  <span>{detail.raceName}</span>
                  <span className="text-white/20">|</span>
                  <span className={inLegion ? "font-semibold text-gold" : "font-semibold text-[#f0a0a0]"}>
                    {detail.regionName || "무소속"}
                  </span>
                </div>
              </div>

              <dl className="ml-auto flex divide-x divide-white/10 text-right">
                <div className="px-4">
                  <dt className="text-[11px] text-white/45">전투력</dt>
                  <dd
                    className="tnum mt-0.5 font-display text-[20px] font-bold text-white"
                    title={formatNumber(detail.combatPower)}
                  >
                    {formatPower(detail.combatPower)}
                  </dd>
                </div>
                <div className="pl-4">
                  <dt className="text-[11px] text-white/45">아이템레벨</dt>
                  <dd className="tnum mt-0.5 font-display text-[20px] font-bold text-white">
                    {formatNumber(detail.itemLevel)}
                  </dd>
                </div>
              </dl>
            </div>

            {!inLegion && (
              <div className="border-t border-crimson/25 bg-crimson/10 px-5 py-3 text-[13px] text-[#f0a0a0]">
                <strong className="font-semibold">{detail.regionName || "무소속"}</strong> — {TARGET_LEGION} 레기온
                소속이 아니라 등록할 수 없습니다.
                <span className="mt-0.5 block text-[11.5px] text-[#f0a0a0]/70">
                  방금 가입했다면 게임 데이터 반영에 시간이 걸릴 수 있습니다. 관리자에게 예외 등록을 요청하세요.
                </span>
              </div>
            )}

            <div className="border-t border-line px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setStep("search");
                  setDetail(null);
                }}
                className="text-[12px] text-dim underline-offset-2 transition-colors hover:text-fg hover:underline"
              >
                다른 캐릭터 선택
              </button>
            </div>
          </section>

          <section className="card mt-4 p-5">
            <p className="eyebrow mb-3">가능한 시간</p>
            <TimetableEditor value={slots} onChange={setSlots} />

            <label className="mt-5 block max-w-lg">
              <span className="label">메모 (선택)</span>
              <input
                className="input mt-1"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="예) 금요일은 늦게 접속 / 부캐 있음"
              />
            </label>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={busy || slots.length === 0}
                className="btn btn-flame"
              >
                {busy ? "등록 중…" : "등록하기"}
              </button>
              {slots.length === 0 && (
                <span className="text-[12px] text-faint">가능한 시간을 한 칸 이상 선택하세요.</span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
