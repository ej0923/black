import "server-only";
import { supabaseAdmin } from "../supabase";
import type { Member, Party, Post } from "../types";
import type {
  ApplicationRow,
  MemberPatch,
  MemberUpsert,
  PartyInput,
  PartyPatch,
  PostInput,
  PostPatch,
  Repo,
} from "./index";

function fail(message: string): never {
  throw new Error(message);
}

export function createSupabaseRepo(): Repo {
  const db = () => supabaseAdmin();

  return {
    kind: "supabase",

    async listMembers() {
      const { data, error } = await db()
        .from("members")
        .select("*")
        .order("combat_power", { ascending: false, nullsFirst: false });
      if (error) fail(error.message);
      return (data ?? []) as Member[];
    },

    async getMember(id) {
      const { data, error } = await db().from("members").select("*").eq("id", id).maybeSingle();
      if (error) fail(error.message);
      return (data as Member) ?? null;
    },

    async upsertMember(input: MemberUpsert) {
      const { data, error } = await db()
        .from("members")
        .upsert({ ...input, synced_at: new Date().toISOString() }, { onConflict: "character_id" })
        .select()
        .single();
      if (error) fail(error.message);
      return data as Member;
    },

    async updateMember(id, patch: MemberPatch) {
      const { data, error } = await db().from("members").update(patch).eq("id", id).select().maybeSingle();
      if (error) fail(error.message);
      return (data as Member) ?? null;
    },

    async deleteMember(id) {
      const { error } = await db().from("members").delete().eq("id", id);
      if (error) fail(error.message);
    },

    async listParties() {
      const { data, error } = await db().from("parties").select("*").order("sort_order").order("created_at");
      if (error) fail(error.message);
      return (data ?? []) as Party[];
    },

    async getParty(id) {
      const { data, error } = await db().from("parties").select("*").eq("id", id).maybeSingle();
      if (error) fail(error.message);
      return (data as Party) ?? null;
    },

    async createParty(input: PartyInput) {
      const { data: last } = await db()
        .from("parties")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await db()
        .from("parties")
        .insert({ ...input, sort_order: (last?.sort_order ?? -1) + 1 })
        .select()
        .single();
      if (error) fail(error.message);
      return data as Party;
    },

    async updateParty(id, patch: PartyPatch) {
      const { data, error } = await db().from("parties").update(patch).eq("id", id).select().maybeSingle();
      if (error) fail(error.message);
      return (data as Party) ?? null;
    },

    async deleteParty(id) {
      const { error } = await db().from("parties").delete().eq("id", id);
      if (error) fail(error.message);
    },

    async listApplications() {
      const { data, error } = await db().from("applications").select("party_id, member_id");
      if (error) fail(error.message);
      return (data ?? []) as ApplicationRow[];
    },

    async listPartyMemberIds(partyId) {
      const { data, error } = await db()
        .from("applications")
        .select("member_id, created_at")
        .eq("party_id", partyId)
        .order("created_at");
      if (error) fail(error.message);
      return (data ?? []).map((row) => row.member_id as string);
    },

    async applyToParty(partyId, memberId) {
      const { error } = await db()
        .from("applications")
        .upsert({ party_id: partyId, member_id: memberId }, { onConflict: "party_id,member_id" });
      if (error) fail(error.message);
    },

    async cancelApplication(partyId, memberId) {
      const { error } = await db()
        .from("applications")
        .delete()
        .eq("party_id", partyId)
        .eq("member_id", memberId);
      if (error) fail(error.message);
    },

    async listPosts(category) {
      let query = db().from("posts").select("*");
      if (category) query = query.eq("category", category);

      const { data, error } = await query
        .order("pinned", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) fail(error.message);
      return (data ?? []) as Post[];
    },

    async getPost(id) {
      const { data, error } = await db().from("posts").select("*").eq("id", id).maybeSingle();
      if (error) fail(error.message);
      return (data as Post) ?? null;
    },

    async createPost(input: PostInput) {
      // 같은 칸의 맨 앞에 오도록 가장 작은 sort_order 보다 하나 더 작게 잡는다.
      const { data: first } = await db()
        .from("posts")
        .select("sort_order")
        .eq("category", input.category)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data, error } = await db()
        .from("posts")
        .insert({ ...input, sort_order: (first?.sort_order ?? 0) - 1 })
        .select()
        .single();
      if (error) fail(error.message);
      return data as Post;
    },

    async updatePost(id, patch: PostPatch) {
      const { data, error } = await db().from("posts").update(patch).eq("id", id).select().maybeSingle();
      if (error) fail(error.message);
      return (data as Post) ?? null;
    },

    async deletePost(id) {
      const { error } = await db().from("posts").delete().eq("id", id);
      if (error) fail(error.message);
    },
  };
}
