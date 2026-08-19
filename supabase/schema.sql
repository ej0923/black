-- ============================================================
--  아이온2 블랙 레기온 공대관리 매니저 — Supabase 스키마 (기준선)
--  Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행하세요.
--
--  이 파일은 **새 프로젝트를 처음 세울 때** 쓰는 기준선이다.
--  이미 돌아가는 DB 에는 이 파일을 다시 붙여넣어도 새 컬럼이 생기지 않는다
--  (`create table if not exists` 가 통째로 건너뛴다).
--  그래서 앞으로 스키마가 바뀌는 작업은 supabase/migrations/ 에
--  번호 붙은 파일(0001_*.sql, 0002_*.sql …)로 따로 남기고,
--  같은 변경을 이 파일에도 반영한다. 규칙은 supabase/migrations/README.md.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 멤버: plaync 캐릭터 정보 스냅샷 + 가능시간
-- available_slots 는 (요일*24 + 시작시각) 정수 배열.
--   요일 0=월 ... 6=일,  시작시각은 2시간 격자 0,2,4,…,22
--   예) 화요일 20시~22시 칸 = 1*24 + 20 = 44
-- ------------------------------------------------------------
create table if not exists public.members (
  id               uuid primary key default gen_random_uuid(),
  character_id     text        not null unique,          -- plaync characterId (디코딩된 원본)
  server_id        integer     not null default 1001,
  server_name      text        not null default '시엘',
  nickname         text        not null,
  class_name       text        not null default '',
  region_name      text,                                 -- 레기온명 (블랙)
  level            integer,
  combat_power     integer,
  item_level       integer,
  profile_image    text,
  note             text,
  region_override  boolean     not null default false,   -- 관리자 예외 허용 여부
  available_slots  smallint[]  not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  synced_at        timestamptz not null default now()
);

create index if not exists members_nickname_idx on public.members (nickname);
create index if not exists members_combat_power_idx on public.members (combat_power desc);

-- ------------------------------------------------------------
-- 파티: 관리자가 자유롭게 추가/삭제
-- ------------------------------------------------------------
create table if not exists public.parties (
  id          uuid primary key default gen_random_uuid(),
  code        text        not null,                      -- A, B, C ...
  name        text,                                      -- 새벽공대 등 라벨
  memo        text,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists parties_sort_idx on public.parties (sort_order, created_at);

-- ------------------------------------------------------------
-- 지원: 확정 절차 없음. 지원 = 참여.
-- ------------------------------------------------------------
create table if not exists public.applications (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid        not null references public.parties(id) on delete cascade,
  member_id   uuid        not null references public.members(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (party_id, member_id)
);

create index if not exists applications_party_idx on public.applications (party_id);
create index if not exists applications_member_idx on public.applications (member_id);

-- ------------------------------------------------------------
-- 홈 글: 공지사항 / 명예의 전당. 관리자만 쓴다(앱 라우트에서 판별).
--
-- body_html 은 에디터가 만든 HTML 이다. 화면에 올리기 전에 반드시
-- src/lib/sanitize.ts 의 sanitizeHtml 을 거친다 — 아래 RLS 설명 참고.
-- ------------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  category    text        not null,
  title       text        not null,
  body_html   text        not null default '',
  pinned      boolean     not null default false,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 분류 목록은 여기서 관리한다.
--
-- create table 안에 check 를 두면, 테이블이 이미 있는 설치본에서는
-- `if not exists` 때문에 통째로 건너뛰어 제약이 옛날 값에 머문다.
-- 그래서 밖으로 빼서 매번 다시 건다 — 새 설치본과 기존 설치본이 같아진다.
-- src/lib/types.ts 의 POST_CATEGORIES 와 반드시 같은 값이어야 한다.
alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts add constraint posts_category_check
  check (category in ('notice', 'hall', 'info'));

create index if not exists posts_category_idx
  on public.posts (category, pinned desc, sort_order, created_at desc);

-- ------------------------------------------------------------
-- updated_at 자동 갱신
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists members_touch_updated_at on public.members;
create trigger members_touch_updated_at
  before update on public.members
  for each row execute function public.touch_updated_at();

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- RLS: anon 키로 붙는 구성.
--
-- 이 서비스는 로그인이 없어서 DB 가 판별할 수 있는 신원이 없다.
-- 그래서 anon 에게 네 테이블 전권을 주고, 관리자 판별은 전적으로
-- Next.js 라우트 핸들러의 쿠키 검사에 맡긴다.
--
-- 주의: 이 정책 아래에서 anon 키를 가진 사람은 앱을 거치지 않고
-- REST 로 직접 아무 행이나 읽고 쓰고 지울 수 있다.
-- service_role 키로 전환하면 아래 정책 4개를 지우는 편이 안전하다.
-- ------------------------------------------------------------
alter table public.members      enable row level security;
alter table public.parties      enable row level security;
alter table public.applications enable row level security;
alter table public.posts        enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete
  on public.members, public.parties, public.applications, public.posts to anon;

drop policy if exists members_anon_all      on public.members;
drop policy if exists parties_anon_all      on public.parties;
drop policy if exists applications_anon_all on public.applications;
drop policy if exists posts_anon_all        on public.posts;

create policy members_anon_all on public.members
  for all to anon using (true) with check (true);

create policy parties_anon_all on public.parties
  for all to anon using (true) with check (true);

create policy applications_anon_all on public.applications
  for all to anon using (true) with check (true);

create policy posts_anon_all on public.posts
  for all to anon using (true) with check (true);

-- posts.body_html 은 화면에 HTML 로 그려진다. 위 정책 때문에 anon 키만 있으면
-- 앱을 거치지 않고 <script> 가 든 본문을 밀어넣을 수 있으므로, 저장할 때뿐
-- 아니라 **그릴 때도** src/lib/sanitize.ts 를 통과시킨다. 그 이중 처리를 빼면 XSS 다.

-- ------------------------------------------------------------
-- 초기 파티 A~F 시드 (이미 있으면 건너뜀)
-- ------------------------------------------------------------
insert into public.parties (code, name, sort_order)
select v.code, v.name, v.ord
from (values
  ('A', null, 0), ('B', null, 1), ('C', null, 2),
  ('D', null, 3), ('E', null, 4), ('F', null, 5)
) as v(code, name, ord)
where not exists (select 1 from public.parties);
