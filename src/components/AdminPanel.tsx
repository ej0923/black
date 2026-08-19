"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TARGET_LEGION } from "@/lib/constants";

export default function AdminPanel({ initialAdmin }: { initialAdmin: boolean }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(initialAdmin);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "로그인에 실패했습니다.");
      setAdmin(true);
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await fetch("/api/admin", { method: "DELETE" });
    setAdmin(false);
    setBusy(false);
    router.refresh();
  }

  if (admin) {
    return (
      <div className="card mt-6 p-5">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          <span className="text-[13px] font-semibold text-gold">관리자 모드 활성</span>
        </div>

        <ul className="mt-3 space-y-1.5 text-[13px] text-muted">
          <li>파티 페이지에서 파티를 추가 / 이름·메모 수정 / 삭제할 수 있습니다.</li>
          <li>명단에서 멤버를 삭제할 수 있습니다.</li>
          <li>
            멤버 등록 화면에서 {TARGET_LEGION} 레기온이 아닌 캐릭터도 등록할 수 있습니다. 이렇게 등록된 멤버는 명단에{" "}
            <span className="tag bg-gold/15 text-gold">예외</span> 표시가 붙습니다.
          </li>
        </ul>

        <button type="button" onClick={logout} disabled={busy} className="btn btn-ghost mt-5">
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={login} className="card mt-6 p-5">
      <label className="block">
        <span className="label">관리자 비밀번호</span>
        <input
          type="password"
          className="input mt-1.5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
        />
      </label>

      {error && <p className="mt-2 text-[12.5px] text-[#f0a0a0]">{error}</p>}

      <button type="submit" disabled={busy || !password} className="btn btn-primary mt-4 w-full">
        {busy ? "확인 중…" : "로그인"}
      </button>

      <p className="mt-3 text-[11.5px] text-faint">
        비밀번호는 서버의 <code className="font-mono">ADMIN_PASSWORD</code> 환경변수에서 설정합니다.
      </p>
    </form>
  );
}
