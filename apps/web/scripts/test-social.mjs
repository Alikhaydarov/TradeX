import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { QueryClient, queryOptions } from "@tanstack/react-query";

function load(file, imports) {
  const source = fs.readFileSync(
    new URL(`../src/${file}`, import.meta.url),
    "utf8",
  );
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
        return imports[name];
      },
      Request,
      Response,
      URL,
      Set,
      Map,
    },
  );
  return exports;
}

const { hydrateReactions, reactionPatch, updatePost, profileOptions } = load(
  "lib/social-data.ts",
  {
    "@tanstack/react-query": { queryOptions },
    "./client-api": { clientApi: async () => ({}) },
  },
);
const post = {
  id: "c10c6b49-5232-4219-8eea-30b3ffb8a15e",
  liked: false,
  reposted: false,
  likes_count: 14,
  reposts_count: 2,
  replies_count: 0,
};
assert.equal(
  hydrateReactions({
    posts: [post],
    likedPostIds: [post.id],
    repostedPostIds: [],
  }).posts[0].liked,
  true,
);
const liked = reactionPatch(post, "like", true);
assert.equal(liked.likes_count, 15);
assert.equal(
  reactionPatch(liked, "like", true).likes_count,
  15,
  "repeated desired state must not increase count",
);
assert.equal(
  reactionPatch(liked, "like", true, null).likes_count,
  15,
  "missing server count must not erase optimistic count",
);
assert.equal(
  reactionPatch({ ...post, likes_count: 0, liked: true }, "like", false)
    .likes_count,
  0,
);
const cache = new QueryClient();
cache.setQueryData(["social", "feed"], { posts: [post] });
cache.setQueryData(profileOptions("Alice").queryKey, {
  profile: { username: "alice" },
  posts: [post],
});
updatePost(cache, post.id, (current) => reactionPatch(current, "repost", true));
updatePost(cache, post.id, (current) =>
  reactionPatch(current, "like", false, 14),
);
assert.equal(
  cache.getQueryData(["social", "feed"]).posts[0].reposts_count,
  3,
  "rollback of a like must preserve a concurrent repost",
);
assert.equal(
  cache.getQueryData(profileOptions("alice").queryKey).profile.username,
  "alice",
);
assert.equal(
  cache.getQueryData(profileOptions("alice").queryKey).posts[0].reposted,
  true,
);
assert.notDeepEqual(
  profileOptions("alice").queryKey,
  profileOptions("bob").queryKey,
);
assert.notDeepEqual(
  profileOptions("alice").queryKey,
  profileOptions("alice", "reposts").queryKey,
);
cache.clear();

let authenticated = true;
let countError = false;
let writeError = false;
const records = new Set();
const calls = [];
const supabase = {
  rpc: async () => ({ data: false, error: null }),
  from(table) {
    const filters = {};
    let mode = "read";
    const query = {
      select(_columns, options) {
        if (options?.head) mode = "count";
        return query;
      },
      eq(key, value) {
        filters[key] = value;
        return query;
      },
      maybeSingle() {
        return query;
      },
      upsert(row, options) {
        assert.equal(options.ignoreDuplicates, true);
        assert.equal(options.onConflict, "post_id,user_id");
        mode = "upsert";
        Object.assign(filters, row);
        return query;
      },
      delete() {
        mode = "delete";
        return query;
      },
      then(resolve) {
        calls.push(`${table}:${mode}`);
        const key = `${table}:${filters.post_id}:${filters.user_id}`;
        if (mode === "count")
          return Promise.resolve({
            count: countError
              ? null
              : [...records].filter((key) =>
                  key.startsWith(`${table}:${filters.post_id}:`),
                ).length,
            error: countError ? { message: "offline" } : null,
          }).then(resolve);
        if (writeError && mode !== "read")
          return Promise.resolve({ error: { message: "denied" } }).then(
            resolve,
          );
        if (mode === "upsert") records.add(key);
        if (mode === "delete") records.delete(key);
        return Promise.resolve({
          data:
            mode === "read" && records.has(key)
              ? { post_id: filters.post_id }
              : null,
          error: null,
        }).then(resolve);
      },
    };
    return query;
  },
};
const { POST } = load("app/api/community/[id]/route.ts", {
  "next/server": {
    NextResponse: { json: (data, init) => Response.json(data, init) },
  },
  "@/lib/supabase/route-auth": {
    getRouteAuth: async () =>
      authenticated ? { supabase, user: { id: "viewer" } } : null,
  },
});
const react = (body, id = post.id) =>
  POST(
    new Request("https://example.test/api/community/post", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
assert.deepEqual(await (await react({ action: "like", active: true })).json(), {
  active: true,
  count: 1,
});
assert.deepEqual(await (await react({ action: "like", active: true })).json(), {
  active: true,
  count: 1,
});
assert.equal(
  calls.filter((call) => call.endsWith(":read")).length,
  0,
  "desired state skips the old read-before-write waterfall",
);
assert.deepEqual(
  await (await react({ action: "like", active: false })).json(),
  { active: false, count: 0 },
);
assert.deepEqual(
  await (await react({ action: "repost", active: true })).json(),
  { active: true, count: 1 },
);
countError = true;
assert.deepEqual(
  await (await react({ action: "like", active: true })).json(),
  { active: true, count: null },
  "successful mutation always returns active even if count fails",
);
countError = false;
assert.equal((await react({ action: "like", active: "true" })).status, 400);
assert.equal((await react({ action: "like" }, "bad-id")).status, 400);
writeError = true;
assert.equal((await react({ action: "like", active: false })).status, 500);
writeError = false;
authenticated = false;
assert.equal((await react({ action: "like", active: true })).status, 401);
console.log(
  "Social regressions passed: cache identity, rollback isolation, duplicate reactions, desired-state writes, count errors, auth and validation.",
);
