# 마이그레이션

[`../schema.sql`](../schema.sql) 은 **새 프로젝트를 처음 세울 때 한 번** 돌리는 기준선이다.
그 뒤에 스키마가 바뀌는 작업은 이 폴더에 **번호 붙은 파일 하나**로 남긴다.
schema.sql 을 고쳐서 기존 설치본이 따라오기를 기대하지 않는다 — 이미 돌아가는 DB 는
`create table if not exists` 를 통째로 건너뛰기 때문에 새 컬럼이 절대 생기지 않는다.

## 파일 이름

```
0001_add_posts_view_count.sql
0002_drop_members_note.sql
```

네 자리 번호 + `_` + 무엇을 하는지 알 수 있는 snake_case 영문. 번호는 건너뛰지 않고
1씩 올린다. 이미 매긴 번호는 나중에 바꾸지 않는다 — 남이 이미 그 번호까지 돌렸을 수 있다.

## 파일 안에 지키는 것

- **여러 번 돌려도 안전하게.** `add column if not exists`, `drop ... if exists`,
  `create or replace`. 누가 두 번 붙여넣어도 깨지지 않아야 한다.
- **제약(constraint)은 drop 후 재생성.** `alter table ... drop constraint if exists`
  다음에 `add constraint`. schema.sql 의 `posts_category_check` 가 그 예다.
- **맨 위에 주석으로** 언제 · 왜 필요한지 한 줄. 반년 뒤의 내가 읽는다.
- 한 파일 = 한 작업. 관련 없는 변경을 묶지 않는다.

## 적용 순서

1. Supabase 대시보드 → SQL Editor 에 파일 내용을 붙여넣고 실행 (번호 순서대로).
2. 같은 변경을 [`../schema.sql`](../schema.sql) 에도 반영한다. 새로 까는 사람은
   schema.sql 만 돌리고 이 폴더를 건너뛰어도 같은 결과가 나와야 한다.
3. 로컬 파일 DB 모드(`USE_LOCAL_DB=true`)를 쓴다면
   [`../../src/lib/db/local.ts`](../../src/lib/db/local.ts) 의 모양도 같이 맞춘다.
4. 컬럼이 늘거나 줄면 [`../../src/lib/types.ts`](../../src/lib/types.ts) 의 타입도 함께.

## 현재 상태

기준선(schema.sql)만 있고 추가 마이그레이션은 아직 없다. 다음 번호는 `0001` 이다.
