export type Member = {
  id: string;
  character_id: string;
  server_id: number;
  server_name: string;
  nickname: string;
  class_name: string;
  region_name: string | null;
  level: number | null;
  combat_power: number | null;
  item_level: number | null;
  profile_image: string | null;
  note: string | null;
  region_override: boolean;
  available_slots: number[];
  created_at: string;
  updated_at: string;
  synced_at: string;
};

export type Party = {
  id: string;
  code: string;
  name: string | null;
  memo: string | null;
  sort_order: number;
  created_at: string;
};

export type PartyWithMembers = Party & {
  members: Member[];
};

/**
 * 글의 분류. 칸/페이지 하나가 분류 하나다.
 *
 * 여기에 값을 추가하면 supabase/schema.sql 의 posts_category_check 제약도
 * 같이 늘려야 한다. 안 그러면 DB 가 insert 를 거부한다.
 */
export const POST_CATEGORIES = ["notice", "hall", "info"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export const POST_CATEGORY_LABEL: Record<PostCategory, string> = {
  notice: "공지사항",
  hall: "명예의 전당",
  info: "정보공유",
};

export function isPostCategory(value: unknown): value is PostCategory {
  return typeof value === "string" && (POST_CATEGORIES as readonly string[]).includes(value);
}

/**
 * 홈 글. 관리자만 쓸 수 있고 본문은 에디터가 만든 HTML 이다.
 * body_html 은 신뢰하지 말 것 — 반드시 sanitizeHtml 을 거쳐 화면에 올린다.
 */
export type Post = {
  id: string;
  category: PostCategory;
  title: string;
  body_html: string;
  pinned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** 파티 상세에서 계산되는 시간대 겹침 구간 */
export type OverlapWindow = {
  day: number;
  startHour: number;
  endHour: number;
  count: number;
  memberIds: string[];
};
