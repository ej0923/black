# 블랙 공대관리 매니저

아이온2 **시엘 서버 · 블랙 레기온** 전용 공격대 편성 매니저.

닉네임을 검색하면 plaync 캐릭터 정보실에서 직업 · 전투력 · 아이템레벨 · 레기온을 자동으로 가져와
블랙 소속인지 검증하고, 파티별로 지원자들의 가능 시간이 겹치는 구간을 계산해 보여준다.

## 화면

| 경로 | 하는 일 |
| --- | --- |
| `/` | 레기온 명단. 닉 검색 · 직업 버튼 필터 · 정렬, 멤버별 가능 시간 목록, 시간 수정, plaync 재조회(갱신), (관리자) 삭제 |
| `/register` | 멤버 등록. 닉 검색 → 캐릭터 확인 → 가능 시간 체크 |
| `/parties` | 파티 목록. 파티별 인원과 최적 시간대 요약, (관리자) 파티 추가/편집/삭제 |
| `/parties/[id]` | **파티 상세.** 맨 위에 겹치는 시간대 텍스트, 아래 타임테이블에 시간대별 인원수(마우스오버 시 닉네임), 지원/취소 |
| `/admin` | 관리자 로그인 |

## Supabase 없이 먼저 돌려보기

`.env.local` 에 한 줄 넣고 `npm run dev` 하면 끝이다.

```
USE_LOCAL_DB=true
```

Supabase 대신 `.data/dev-db.json` 파일에 저장하고, 파티 A~F 와 샘플 멤버 6명이 깔린다.
샘플은 전원 A 파티에 지원되어 있어 겹침 계산 화면을 바로 볼 수 있다 (최적 시간대: 화 20:00~24:00, 5/6명).
파일을 지우면 초기화된다.

캐릭터 검색·조회는 이 모드에서도 **실제 plaync** 를 호출한다. 다만 등록은 블랙 레기온 캐릭터만
통과하므로, 임의의 캐릭터로 등록 흐름을 시험하려면 `/admin` 에서 로그인한 뒤 예외 등록으로 진행한다.

저장소는 [`src/lib/db/`](src/lib/db) 뒤에 인터페이스로 감춰져 있다. supabase 구현과 local 구현이
같은 `Repo` 를 만족하므로, 화면과 라우트 핸들러는 어느 쪽이 붙었는지 모른다.

## 설치

### 1. Supabase 프로젝트 생성

[supabase.com/dashboard](https://supabase.com/dashboard) 에서 새 프로젝트를 만든다.

### 2. 스키마 생성

Supabase 대시보드 → **SQL Editor** → [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣고 실행.
테이블 4개(`members`, `parties`, `applications`, `posts`)와 초기 파티 A~F 가 만들어진다.

schema.sql 은 **처음 한 번** 돌리는 기준선이다. 그 뒤 스키마가 바뀌는 작업은
[`supabase/migrations/`](supabase/migrations) 에 번호 붙은 파일(`0001_*.sql`, `0002_*.sql` …)로
쌓이므로, 이미 만들어 둔 DB 라면 아직 안 돌린 번호부터 순서대로 실행하면 된다.
규칙은 [`supabase/migrations/README.md`](supabase/migrations/README.md).

### 3. 환경변수

`.env.local.example` 을 참고해 `.env.local` 을 채운다.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...      # Settings → API → service_role
ADMIN_PASSWORD=관리자_비밀번호
ADMIN_SECRET=아무_긴_랜덤_문자열
```

> `service_role` 키는 서버에서만 쓰인다. 브라우저로 절대 내려보내지 말 것.
>
> 모든 테이블에 RLS 가 켜져 있지만, schema.sql 은 로그인 없는 구성을 위해
> **anon 에게 네 테이블 전권을 주는 정책**을 함께 건다. 즉 anon 키를 가진 사람은
> 앱을 거치지 않고 REST 로 직접 읽고 쓸 수 있다. `service_role` 키를 넣어 쓰는 경우
> 그 정책 4개(`*_anon_all`)를 지우는 편이 안전하다.

### 4. 실행

```bash
npm install
npm run dev
```

## 디자인

토큰은 지어낸 값이 아니라 [aion2.plaync.com](https://aion2.plaync.com/ko-kr/index) 의 배포 스타일시트에서
그대로 뽑아 왔다.

| 항목 | 값 | 출처 |
| --- | --- | --- |
| 배너 그라디언트 | `linear-gradient(90deg,#213140,#344859 55%)` | `static-aion2/characters/css/index.css` |
| 브랜드 블루 | `#1566b3` (딥) · `#3d94d8` (라이트) · `#074783` (잉크) | 같은 파일에서 최다 사용 색 |
| 강조 | `#ee6c2a` (오렌지) · `#e9a43a` (골드) · `#09ce9f` (민트) | 〃 |
| 디스플레이 서체 | `Aion2` Light/Medium/Bold | `assets.playnccdn.com/uikit/preorder/client/fonts/` |

`Aion2` 웹폰트는 playnccdn 이 `Access-Control-Allow-Origin: *` 로 서빙하므로 교차 출처로 바로 쓸 수 있다.
제목·숫자·파티 코드에만 쓰고 본문은 Pretendard 가 맡는다. 로드에 실패하면 Pretendard 로 조용히 떨어진다.

> NCSOFT 소유 서체다. 비공식 팬 서비스에서 쓰는 것은 회색지대이므로, 문제가 되면
> `src/app/globals.css` 의 `@font-face` 세 블록만 지우면 된다. 나머지는 그대로 동작한다.

프론트엔드 의존성은 셋뿐이다.

| 패키지 | GitHub | 쓰는 이유 |
| --- | --- | --- |
| `pretendard` | [orioncactus/pretendard](https://github.com/orioncactus/pretendard) | 한글 본문 서체. 동적 서브셋 CSS 라 필요한 글리프만 내려온다 |
| `@radix-ui/colors` | [radix-ui/colors](https://github.com/radix-ui/colors) | 알파 스케일. 헤어라인과 호버 오버레이가 어떤 배경 위에서도 같은 세기로 보인다 |
| `@floating-ui/react` | [floating-ui/floating-ui](https://github.com/floating-ui/floating-ui) | 히트맵 툴팁. `flip` + `shift` 로 첫 줄·가장자리 칸에서 잘리지 않는다 |

## 동작 방식

### plaync 연동

plaync 캐릭터 정보실은 인증 없이 열려 있는 JSON API 를 쓴다. 브라우저에서 직접 부르면 CORS 로
막히므로 Next.js 라우트 핸들러(`/api/plaync/*`)를 프록시로 둔다. 클라이언트는 서버를 거쳐서만
plaync 를 호출한다.

| 엔드포인트 | 쓰임 |
| --- | --- |
| `GET /api/gameinfo/pcdata` | `pcId` → 직업 한글명 매핑 (12시간 캐시) |
| `GET /api/search/character` | 닉 검색. `keyword` + `serverId` + `race` 가 **모두** 필요하다 (하나라도 빠지면 400) |
| `GET /api/character/info` | `profile.combatPower` · `profile.regionName` · `stat.statList[type=ItemLevel].value` |

시엘 = `serverId 1001`, 천족 = `race 1`.

`characterId` 는 검색 응답에서 `...%3D` 처럼 부분 인코딩된 채로 온다. 통째로
`encodeURIComponent` 하면 `%` 가 이중 인코딩되어 404 가 나므로, 디코딩된 형태를 DB 에 보관하고
요청할 때만 예약문자를 직접 치환한다 (`src/lib/plaync.ts`).

### 레기온 검증

등록 시 클라이언트가 보낸 닉네임을 믿지 않고 서버가 `characterId` 로 plaync 를 다시 조회해
`profile.regionName === "블랙"` 를 확인한다. 아니면 403 으로 막고, 관리자 세션일 때만
`region_override = true` 로 예외 등록된다. 갱신 후 레기온을 벗어난 멤버는 자동 삭제하지 않고
명단에 배지로 드러낸다.

### 타임테이블

가능 시간은 `members.available_slots` 에 `요일*24 + 시작시각` 정수 배열로 저장한다.
요일 0=월 … 6=일, 시작시각은 2시간 격자 `0, 2, 4, … 22`. 월~일 × 00:00\~24:00 = **12칸 × 7일 = 84칸**.

격자를 바꾸려면 [`src/lib/constants.ts`](src/lib/constants.ts) 의 `HOURS` 와 `SLOT_HOURS` 만 고치면 된다.
편집기·집계표·겹침 계산이 모두 이 둘에서 파생된다.

파티 상세의 "겹치는 시간대"는 모든 칸 중 최대 인원을 찾고, 같은 요일에서 그 인원이 연속으로
이어지면 한 구간으로 합친다. 구간에 표시되는 닉네임은 구간 **내내** 계속 가능한 사람들(교집합)이다.

### 권한

로그인이 없다. 멤버 등록 · 가능 시간 수정 · 파티 지원/취소는 누구나 할 수 있다.
관리자 비밀번호로만 되는 것은 파티 추가/수정/삭제, 멤버 삭제, 레기온 예외 등록 세 가지다.
비밀번호에서 파생한 HMAC 을 httpOnly 쿠키에 담으며, `ADMIN_PASSWORD` 를 바꾸면 기존 세션은
자동으로 무효가 된다.

## 배포

Vercel 에 그대로 올라간다. 환경변수 4개(`NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SECRET`)를 프로젝트 설정에 넣으면 된다.

---

비공식 팬 서비스이며 NCSOFT 와 관계가 없다.
