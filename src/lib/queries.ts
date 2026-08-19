import "server-only";
import { getRepo, type ApplicationRow } from "./db";
import { sanitizeHtml } from "./sanitize";
import type { Member, Party, Post, PostCategory } from "./types";

export type { ApplicationRow };

export async function listMembers(): Promise<Member[]> {
  return (await getRepo()).listMembers();
}

export async function listParties(): Promise<Party[]> {
  return (await getRepo()).listParties();
}

export async function listApplications(): Promise<ApplicationRow[]> {
  return (await getRepo()).listApplications();
}

export async function getParty(id: string): Promise<Party | null> {
  return (await getRepo()).getParty(id);
}

/**
 * 홈 글 목록.
 *
 * 본문을 여기서 한 번 더 정제한다. 저장할 때도 정제하지만, anon 키 구성에서는
 * 앱을 거치지 않고 DB 에 직접 쓴 행이 있을 수 있어서 저장 시점의 정제를 믿을 수 없다.
 * 화면에 올라가는 마지막 길목이 여기다.
 */
export async function listPosts(category?: PostCategory): Promise<Post[]> {
  const posts = await (await getRepo()).listPosts(category);
  return posts.map((post) => ({ ...post, body_html: sanitizeHtml(post.body_html) }));
}

/** 글 하나. 본문 정제 이유는 listPosts 주석과 같다. */
export async function getPost(id: string): Promise<Post | null> {
  const post = await (await getRepo()).getPost(id);
  return post && { ...post, body_html: sanitizeHtml(post.body_html) };
}

/** 특정 파티에 지원한 멤버들. 지원한 순서를 유지한다. */
export async function getPartyMembers(partyId: string): Promise<Member[]> {
  const repo = await getRepo();
  const ids = await repo.listPartyMemberIds(partyId);
  if (ids.length === 0) return [];

  const byId = new Map((await repo.listMembers()).map((m) => [m.id, m]));
  return ids.map((id) => byId.get(id)).filter((m): m is Member => Boolean(m));
}
