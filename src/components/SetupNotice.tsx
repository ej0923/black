/**
 * Supabase 연결 전이거나 스키마가 없을 때 흰 화면 대신 무엇을 해야 하는지 보여준다.
 */
export default function SetupNotice({ message }: { message: string }) {
  const missingEnv = message.includes("환경변수");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="border-b border-line pb-5">
        <p className="eyebrow mb-1.5">Setup</p>
        <h1 className="font-display text-[24px] font-bold tracking-[-0.02em] text-fg">
          {missingEnv ? "Supabase 연결이 필요합니다" : "데이터를 불러오지 못했습니다"}
        </h1>
        <p className="mt-2 text-[13px] text-dim">{message}</p>
      </div>

      <div className="card mt-5 p-5">
        <p className="eyebrow mb-3">먼저 그냥 써보고 싶다면</p>
        <p className="text-[13px] text-muted">
          Supabase 없이도 전체 기능을 돌려볼 수 있습니다. <code className="font-mono text-brand">.env.local</code> 에
          아래 한 줄을 넣고 개발 서버를 재시작하면, 데이터가{" "}
          <code className="font-mono text-brand">.data/dev-db.json</code> 파일에 저장되고 샘플 멤버 6명과 파티 A~F 가
          깔립니다.
        </p>
        <pre className="mt-3 border border-line bg-[#0b1218] px-3 py-2.5 font-mono text-[12.5px] text-mint">
USE_LOCAL_DB=true
        </pre>
        <p className="mt-2 text-[11.5px] text-faint">
          파일을 지우면 초기화됩니다. 캐릭터 검색·조회는 이 모드에서도 실제 plaync 를 그대로 호출합니다.
        </p>
      </div>

      <div className="card mt-4 p-5">
        <p className="eyebrow mb-3">실서비스로 붙이기</p>
        <ol className="space-y-2.5 text-[13px] text-muted">
          <li className="flex gap-2.5">
            <span className="tnum shrink-0 font-mono text-brand">1</span>
            <span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-brand underline underline-offset-2"
              >
                supabase.com/dashboard
              </a>
              에서 프로젝트를 만듭니다.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="tnum shrink-0 font-mono text-brand">2</span>
            <span>
              SQL Editor 에 <code className="font-mono text-fg">supabase/schema.sql</code> 전체를 붙여넣고 실행합니다.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="tnum shrink-0 font-mono text-brand">3</span>
            <span>
              Settings → API 에서 값을 복사해 <code className="font-mono text-fg">.env.local</code> 을 채웁니다.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="tnum shrink-0 font-mono text-brand">4</span>
            <span>
              개발 서버를 재시작합니다 (<code className="font-mono text-fg">npm run dev</code>).
            </span>
          </li>
        </ol>

        <pre className="mt-4 overflow-x-auto border border-line bg-[#0b1218] p-3.5 font-mono text-[12px] text-dim">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
ADMIN_PASSWORD=원하는_관리자_비밀번호
ADMIN_SECRET=아무_긴_랜덤_문자열`}
        </pre>
      </div>
    </div>
  );
}
