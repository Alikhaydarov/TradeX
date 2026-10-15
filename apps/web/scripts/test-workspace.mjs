import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const source = (path) =>
  fs.readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
function load(path, imports = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source(path), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require(name) {
        if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
        return imports[name];
      },
      URL,
      Response,
      Map,
    },
  );
  return exports;
}

const { isTradingRoute } = load("lib/workspace-routes.ts");
for (const route of [
  "/dashboard",
  "/calendar/2026/1",
  "/trades",
  "/analytics",
  "/risk",
  "/coach",
])
  assert.equal(isTradingRoute(route), true);
for (const route of [
  "/home",
  "/community",
  "/u/alice",
  "/profile",
  "/accounts",
  "/settings",
  "/settings/profile",
  "/tradesman",
])
  assert.equal(isTradingRoute(route), false);
const { DataLoader } = load("components/data-loader.tsx", {
  "react/jsx-runtime": jsx,
});
const loading = renderToStaticMarkup(DataLoader({ label: "Loading people" }));
assert.equal((loading.match(/role="status"/g) ?? []).length, 1);
assert.ok(
  !loading.includes("<img"),
  "Data fetching must never show the boot logo",
);
assert.ok(!source("app/(product)/loading.tsx").includes("WorkspaceLoader"));
assert.ok(
  !fs.existsSync(
    new URL("../src/app/(product)/dashboard/loading.tsx", import.meta.url),
  ),
  "No redundant nested dashboard loader",
);
assert.ok(
  !source("app/(product)/settings/profile/page.tsx").includes("auth.getUser"),
  "Settings shares the request-scoped bootstrap",
);
const { loadAccountSummaries } = load("lib/account-summaries.ts");
const accountCalls = [];
const accountDb = {
  from(table) {
    const query = {
      select(columns) {
        accountCalls.push([table, columns]);
        return query;
      },
      eq() {
        return query;
      },
      order() {
        return query;
      },
      limit() {
        return query;
      },
      then(resolve) {
        return Promise.resolve(
          table === "prop_accounts"
            ? {
                data: [
                  { id: "account-a", initial_balance: 1000 },
                  { id: "account-b", initial_balance: 500 },
                ],
                error: null,
              }
            : {
                data: [
                  { prop_account_id: "account-a", pnl: 20 },
                  { prop_account_id: "account-a", pnl: -5 },
                  { prop_account_id: "account-b", pnl: 3 },
                ],
                error: null,
              },
        ).then(resolve);
      },
    };
    return query;
  },
};
const summaries = await loadAccountSummaries(accountDb, "viewer");
assert.deepEqual(
  Array.from(summaries, ({ pnl, trades }) => [pnl, trades]),
  [
    [15, 2],
    [3, 1],
  ],
);
assert.equal(
  accountCalls.length,
  2,
  "Account and trade summaries load concurrently",
);

let authenticated = true;
let profileExists = true;
let failedTable = null;
let mode = "followers";
const calls = [];
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const people = Array.from({ length: 31 }, (_, i) => ({
  id: id(i + 1),
  username: `person${i + 1}`,
  full_name: `Person ${i + 1}`,
  avatar_url: null,
  bio: null,
  is_verified: false,
}));
const supabase = {
  from(table) {
    const call = { table, filters: {}, columns: "", ids: null, after: null };
    calls.push(call);
    const query = {
      select(columns) {
        call.columns = columns;
        return query;
      },
      eq(key, value) {
        call.filters[key] = value;
        return query;
      },
      gt(key, value) {
        call.after = [key, value];
        return query;
      },
      in(key, ids) {
        assert.equal(key, "id");
        call.ids = ids;
        return query;
      },
      order(key, options) {
        call.order = [key, options];
        return query;
      },
      limit(count) {
        call.limit = count;
        return query;
      },
      abortSignal() {
        return query;
      },
      maybeSingle() {
        return query;
      },
      then(resolve) {
        if (failedTable === table)
          return Promise.resolve({
            data: null,
            error: { message: "private database error" },
          }).then(resolve);
        let data;
        if (table === "profiles")
          data = call.ids
            ? people.filter((person) => call.ids.includes(person.id)).reverse()
            : profileExists
              ? { id: "owner" }
              : null;
        else {
          assert.equal(call.limit, 31);
          const personColumn =
            mode === "followers" ? "follower_id" : "following_id";
          const ownerColumn =
            mode === "followers" ? "following_id" : "follower_id";
          assert.equal(call.filters[ownerColumn], "owner");
          assert.equal(call.order[0], personColumn);
          data = people
            .filter((person) => !call.after || person.id > call.after[1])
            .map((person) => ({
              [ownerColumn]: "owner",
              [personColumn]: person.id,
            }));
        }
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    };
    return query;
  },
};
const { GET } = load(
  "app/api/community/profile/[username]/connections/route.ts",
  {
    "next/server": {
      NextResponse: { json: (body, init) => Response.json(body, init) },
    },
    "@/lib/supabase/route-auth": {
      getRouteAuth: async () =>
        authenticated ? { supabase, user: { id: "viewer" } } : null,
    },
  },
);
const request = (query = "") =>
  GET(new Request("https://example.test/connections" + query), {
    params: Promise.resolve({ username: "Alice" }),
  });
let response = await request();
assert.equal(response.status, 200);
assert.equal(response.headers.get("cache-control"), "private, no-store");
let result = await response.json();
assert.equal(result.people.length, 30);
assert.equal(
  result.people[0].id,
  id(1),
  "Restore relation order after profile lookup",
);
assert.equal(result.nextCursor, id(30));
assert.equal(calls[0].filters.username, "alice");
assert.equal(
  calls[2].columns,
  "id,username,full_name,avatar_url,bio,is_verified",
  "Never return email or private profile fields",
);
result = await (await request(`?cursor=${id(30)}`)).json();
assert.equal(result.people.length, 1);
assert.equal(result.people[0].id, id(31));
assert.equal(result.nextCursor, null);
mode = "following";
assert.equal((await request("?type=following")).status, 200);
assert.equal((await request("?type=invalid")).status, 400);
assert.equal((await request("?cursor=bad")).status, 400);
profileExists = false;
assert.equal((await request()).status, 404);
profileExists = true;
failedTable = "user_follows";
response = await request();
assert.equal(response.status, 503);
assert.ok(!(await response.text()).includes("private database error"));
failedTable = null;
authenticated = false;
const before = calls.length;
assert.equal((await request()).status, 401);
assert.equal(
  calls.length,
  before,
  "Unauthenticated requests cannot read connections",
);
console.log(
  "Workspace regressions passed: route-scoped controls, data-only loader, shared settings bootstrap, authenticated connections, stable pagination, public fields, errors.",
);
