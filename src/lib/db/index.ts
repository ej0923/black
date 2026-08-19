import "server-only";
import type { Member, Party, Post, PostCategory } from "../types";

export type ApplicationRow = { party_id: string; member_id: string };

/** 멤버 신규 등록 / 재등록 시 서버가 채우는 전체 필드 */
export type MemberUpsert = {
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
};

export type MemberPatch = Partial<Omit<Member, "id" | "created_at" | "updated_at">>;

export type PartyInput = { code: string; name: string | null; memo: string | null };
export type PartyPatch = Partial<PartyInput>;

/** body_html 은 저장 전에 sanitizeHtml 을 거친 값이어야 한다. */
export type PostInput = { category: PostCategory; title: string; body_html: string; pinned: boolean };
export type PostPatch = Partial<PostInput> & { sort_order?: number };

/**
 * 저장소 인터페이스.
 *
 * 구현이 둘이다.
 *  - supabase : 실서비스
 *  - local    : USE_LOCAL_DB=true 일 때 .data/dev-db.json 파일에 저장. 연동 없이 굴려보기 위한 것.
 */
export interface Repo {
  readonly kind: "supabase" | "local";

  listMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | null>;
  upsertMember(input: MemberUpsert): Promise<Member>;
  updateMember(id: string, patch: MemberPatch): Promise<Member | null>;
  deleteMember(id: string): Promise<void>;

  listParties(): Promise<Party[]>;
  getParty(id: string): Promise<Party | null>;
  createParty(input: PartyInput): Promise<Party>;
  updateParty(id: string, patch: PartyPatch): Promise<Party | null>;
  deleteParty(id: string): Promise<void>;

  listApplications(): Promise<ApplicationRow[]>;
  /** 지원한 순서대로 */
  listPartyMemberIds(partyId: string): Promise<string[]>;
  applyToParty(partyId: string, memberId: string): Promise<void>;
  cancelApplication(partyId: string, memberId: string): Promise<void>;

  /** 고정글 먼저, 그다음 sort_order, 그다음 최신순 */
  listPosts(category?: PostCategory): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  createPost(input: PostInput): Promise<Post>;
  updatePost(id: string, patch: PostPatch): Promise<Post | null>;
  deletePost(id: string): Promise<void>;
}

export function isLocalDb(): boolean {
  return process.env.USE_LOCAL_DB === "true" || process.env.USE_LOCAL_DB === "1";
}

let cached: Repo | null = null;

export async function getRepo(): Promise<Repo> {
  if (cached) return cached;

  if (isLocalDb()) {
    const { createLocalRepo } = await import("./local");
    cached = createLocalRepo();
  } else {
    const { createSupabaseRepo } = await import("./supabase");
    cached = createSupabaseRepo();
  }
  return cached;
}
