"use client";

import { useEffect, useRef, useState } from "react";
import { RACE_NAME, SERVER_NAME } from "@/lib/constants";
import { classColor } from "@/lib/format";

export type SearchHit = {
  characterId: string;
  name: string;
  level: number;
  className: string;
  serverName: string;
  profileImageUrl: string | null;
};

type Props = {
  onPick: (hit: SearchHit) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

/** plaync 캐릭터 검색 — 두 글자부터 자동으로 조회한다. */
export default function CharacterPicker({ onPick, placeholder, autoFocus }: Props) {
  const [keyword, setKeyword] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const reqId = useRef(0);

  // 두 글자 미만이면 아예 조회하지 않는다. 이전 결과는 state 를 비우는 대신
  // 렌더 단계에서 걸러내어, 이펙트 본문에서 동기적으로 setState 하지 않도록 한다.
  const query = keyword.trim();
  const active = query.length >= 2;

  useEffect(() => {
    if (query.length < 2) return;

    const timer = setTimeout(async () => {
      const id = ++reqId.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/plaync/search?keyword=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (id !== reqId.current) return; // 늦게 도착한 응답 무시
        if (!res.ok) throw new Error(json.error ?? "검색에 실패했습니다.");
        setHits(json.list ?? []);
        setError(null);
      } catch (err) {
        if (id !== reqId.current) return;
        setHits([]);
        setError(err instanceof Error ? err.message : "검색에 실패했습니다.");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const visibleHits = active ? hits : [];
  const visibleError = active ? error : null;
  const searching = active && loading;

  return (
    <div>
      <div className="relative">
        <input
          className="input h-10 pr-24 text-[15px]"
          value={keyword}
          autoFocus={autoFocus}
          onChange={(e) => {
            setKeyword(e.target.value);
            setTouched(true);
          }}
          placeholder={placeholder ?? "캐릭터 닉네임 (2글자 이상)"}
          aria-label="캐릭터 검색"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] text-faint">
          {searching ? "검색 중…" : `${SERVER_NAME} · ${RACE_NAME}`}
        </span>
      </div>

      {visibleError && <p className="mt-2 text-[12.5px] text-[#f0a0a0]">{visibleError}</p>}

      {touched && active && !searching && visibleHits.length === 0 && !visibleError && (
        <p className="mt-2 text-[12.5px] text-dim">검색 결과가 없습니다. 닉네임을 확인해 주세요.</p>
      )}

      {visibleHits.length > 0 && (
        <ul className="mt-2 max-h-80 overflow-y-auto border border-line">
          {visibleHits.map((hit) => (
            <li key={hit.characterId} className="row">
              <button
                type="button"
                onClick={() => onPick(hit)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left"
              >
                <span className="tnum w-8 shrink-0 border border-line bg-raised py-0.5 text-center font-mono text-[11px] text-dim">
                  {hit.level}
                </span>
                <span className="text-[14px] font-semibold text-fg">{hit.name}</span>
                <span className={`text-[11.5px] font-medium ${classColor(hit.className)}`}>{hit.className}</span>
                <span className="ml-auto text-[11px] text-faint">{hit.serverName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
