import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { SERVER_ID, SERVER_NAME, TARGET_LEGION } from "../constants";
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

/**
 * Supabase 연동 없이 굴려보기 위한 로컬 저장소.
 * USE_LOCAL_DB=true 일 때만 쓰인다. 데이터는 .data/dev-db.json 한 파일에 들어간다.
 *
 * 파일을 지우면 샘플 데이터가 다시 깔린다. 실서비스용이 아니다.
 */

type ApplicationRecord = ApplicationRow & { created_at: string };

type Snapshot = {
  members: Member[];
  parties: Party[];
  applications: ApplicationRecord[];
  posts: Post[];
};

const FILE = join(process.cwd(), ".data", "dev-db.json");

// 파일 읽고-고치고-쓰는 사이에 다른 요청이 끼어들지 않도록 순차 처리한다.
let chain: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

async function read(): Promise<Snapshot> {
  let parsed: Partial<Snapshot>;
  try {
    parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<Snapshot>;
  } catch {
    const seeded = seed();
    await write(seeded);
    return seeded;
  }

  // 기능이 늘어나기 전에 만들어진 파일에는 없는 칸이 있다. 지우게 하지 말고 채워준다.
  return {
    members: parsed.members ?? [],
    parties: parsed.parties ?? [],
    applications: parsed.applications ?? [],
    posts: parsed.posts ?? samplePosts(),
  };
}

async function write(snapshot: Snapshot): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(snapshot, null, 2), "utf8");
}

function mutate<T>(fn: (s: Snapshot) => T | Promise<T>): Promise<T> {
  return serialize(async () => {
    const snapshot = await read();
    const result = await fn(snapshot);
    await write(snapshot);
    return result;
  });
}

// ---------------------------------------------------------------- 샘플 데이터

const NOW = "2026-01-01T00:00:00.000Z";

function slots(days: number[], hours: number[]): number[] {
  return days.flatMap((d) => hours.map((h) => d * 24 + h)).sort((a, b) => a - b);
}

type SampleSpec = [nickname: string, className: string, power: number, item: number, days: number[], hours: number[]];

// 요일은 0=월, 시작시각은 2시간 격자(0,2,…,22)에 맞춰야 한다.
// 화요일 20시·22시 두 칸만 5명이 겹치도록 짜여 있다 → "화 20:00~24:00, 5/6명".
const SAMPLES: SampleSpec[] = [
  ["샘플검성", "검성", 512000, 4700, [0, 1, 2, 3, 4], [20, 22]],
  ["샘플수호성", "수호성", 603954, 4969, [1, 2, 3], [20, 22]],
  ["샘플치유성", "치유성", 401062, 4210, [1, 3, 5], [20, 22]],
  ["샘플궁성", "궁성", 455300, 4530, [0, 1, 2, 3, 4, 5, 6], [22]],
  ["샘플마도성", "마도성", 388900, 4110, [0, 1, 2], [18, 20]],
  ["샘플호법성", "호법성", 472100, 4480, [1, 2, 4, 5, 6], [20, 22]],
];

/** 홈이 텅 비어 보이지 않도록 깔아두는 예시 글 */
function samplePosts(): Post[] {
  return [
    {
      id: randomUUID(),
      category: "notice",
      title: "레기온 공지 예시",
      body_html:
        '<p><span style="font-size: 18px"><b>공대 일정</b></span></p>' +
        "<p>매주 <b>목요일 21시</b>에 모입니다. 늦으면 미리 알려주세요.</p>" +
        '<p><span style="color: #ee6c2a">관리자 모드로 들어가면 이 글을 고치거나 지울 수 있습니다.</span></p>',
      pinned: true,
      sort_order: 0,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: randomUUID(),
      category: "hall",
      title: "이달의 딜러 — 샘플검성",
      body_html:
        "<p>이번 달 레이드 기여도 1위입니다. 축하합니다!</p>" +
        '<p><span style="color: #e9a43a"><b>보상</b></span> · 레기온 창고 이용 우선권</p>',
      pinned: false,
      sort_order: 0,
      created_at: NOW,
      updated_at: NOW,
    },
  ];
}

function seed(): Snapshot {
  const parties: Party[] = ["A", "B", "C", "D", "E", "F"].map((code, i) => ({
    id: randomUUID(),
    code,
    name: i === 0 ? "샘플 공대" : null,
    memo: i === 0 ? "USE_LOCAL_DB 모드의 예시 데이터입니다" : null,
    sort_order: i,
    created_at: NOW,
  }));

  const members: Member[] = SAMPLES.map(([nickname, className, power, item, days, hours]) => ({
    id: randomUUID(),
    character_id: `local:${nickname}`,
    server_id: SERVER_ID,
    server_name: SERVER_NAME,
    nickname,
    class_name: className,
    region_name: TARGET_LEGION,
    level: 50,
    combat_power: power,
    item_level: item,
    profile_image: null,
    note: null,
    region_override: false,
    available_slots: slots(days, hours),
    created_at: NOW,
    updated_at: NOW,
    synced_at: NOW,
  }));

  // 전원 A 파티에 지원시켜 두면 겹침 계산 화면을 바로 볼 수 있다.
  const applications: ApplicationRecord[] = members.map((m) => ({
    party_id: parties[0].id,
    member_id: m.id,
    created_at: NOW,
  }));

  return { members, parties, applications, posts: samplePosts() };
}

// ---------------------------------------------------------------- 구현

export function createLocalRepo(): Repo {
  return {
    kind: "local",

    async listMembers() {
      const { members } = await serialize(read);
      return [...members].sort((a, b) => (b.combat_power ?? 0) - (a.combat_power ?? 0));
    },

    async getMember(id) {
      const { members } = await serialize(read);
      return members.find((m) => m.id === id) ?? null;
    },

    async upsertMember(input: MemberUpsert) {
      return mutate((s) => {
        const now = new Date().toISOString();
        const existing = s.members.find((m) => m.character_id === input.character_id);

        if (existing) {
          Object.assign(existing, input, { updated_at: now, synced_at: now });
          return existing;
        }

        const created: Member = {
          ...input,
          id: randomUUID(),
          created_at: now,
          updated_at: now,
          synced_at: now,
        };
        s.members.push(created);
        return created;
      });
    },

    async updateMember(id, patch: MemberPatch) {
      return mutate((s) => {
        const member = s.members.find((m) => m.id === id);
        if (!member) return null;
        Object.assign(member, patch, { updated_at: new Date().toISOString() });
        return member;
      });
    },

    async deleteMember(id) {
      await mutate((s) => {
        s.members = s.members.filter((m) => m.id !== id);
        s.applications = s.applications.filter((a) => a.member_id !== id);
      });
    },

    async listParties() {
      const { parties } = await serialize(read);
      return [...parties].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    },

    async getParty(id) {
      const { parties } = await serialize(read);
      return parties.find((p) => p.id === id) ?? null;
    },

    async createParty(input: PartyInput) {
      return mutate((s) => {
        const created: Party = {
          ...input,
          id: randomUUID(),
          sort_order: s.parties.reduce((max, p) => Math.max(max, p.sort_order), -1) + 1,
          created_at: new Date().toISOString(),
        };
        s.parties.push(created);
        return created;
      });
    },

    async updateParty(id, patch: PartyPatch) {
      return mutate((s) => {
        const party = s.parties.find((p) => p.id === id);
        if (!party) return null;
        Object.assign(party, patch);
        return party;
      });
    },

    async deleteParty(id) {
      await mutate((s) => {
        s.parties = s.parties.filter((p) => p.id !== id);
        s.applications = s.applications.filter((a) => a.party_id !== id);
      });
    },

    async listApplications() {
      const { applications } = await serialize(read);
      return applications.map(({ party_id, member_id }) => ({ party_id, member_id }));
    },

    async listPartyMemberIds(partyId) {
      const { applications } = await serialize(read);
      return applications
        .filter((a) => a.party_id === partyId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((a) => a.member_id);
    },

    async applyToParty(partyId, memberId) {
      await mutate((s) => {
        const exists = s.applications.some((a) => a.party_id === partyId && a.member_id === memberId);
        if (!exists) {
          s.applications.push({ party_id: partyId, member_id: memberId, created_at: new Date().toISOString() });
        }
      });
    },

    async cancelApplication(partyId, memberId) {
      await mutate((s) => {
        s.applications = s.applications.filter((a) => !(a.party_id === partyId && a.member_id === memberId));
      });
    },

    async listPosts(category) {
      const { posts } = await serialize(read);
      return posts
        .filter((p) => !category || p.category === category)
        .sort(
          (a, b) =>
            Number(b.pinned) - Number(a.pinned) ||
            a.sort_order - b.sort_order ||
            b.created_at.localeCompare(a.created_at),
        );
    },

    async getPost(id) {
      const { posts } = await serialize(read);
      return posts.find((p) => p.id === id) ?? null;
    },

    async createPost(input: PostInput) {
      return mutate((s) => {
        const now = new Date().toISOString();
        const created: Post = {
          ...input,
          id: randomUUID(),
          // 같은 칸의 맨 앞으로
          sort_order:
            s.posts.filter((p) => p.category === input.category).reduce((min, p) => Math.min(min, p.sort_order), 0) - 1,
          created_at: now,
          updated_at: now,
        };
        s.posts.push(created);
        return created;
      });
    },

    async updatePost(id, patch: PostPatch) {
      return mutate((s) => {
        const post = s.posts.find((p) => p.id === id);
        if (!post) return null;
        Object.assign(post, patch, { updated_at: new Date().toISOString() });
        return post;
      });
    },

    async deletePost(id) {
      await mutate((s) => {
        s.posts = s.posts.filter((p) => p.id !== id);
      });
    },
  };
}
