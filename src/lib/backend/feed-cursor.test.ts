import assert from "node:assert/strict";
import { test } from "node:test";

import {
  encodeFeedCursor,
  feedKeysetFilter,
  parseFeedCursor,
} from "./feed-cursor";

const UUID = "a21e0640-c6c1-4ed1-9e22-97ddbaadae92";
// The shape the database actually emits: to_json(created_at) gives microsecond
// precision and a full-width offset.
const TS = "2026-08-22T11:36:12.306344+00:00";

test("accepts the timestamp shape Postgres emits", () => {
  assert.deepEqual(parseFeedCursor(`${TS}|${UUID}`), {
    createdAt: TS,
    id: UUID,
  });
});

test("keeps microsecond precision", () => {
  // Round-tripping through Date would truncate to milliseconds and move the
  // page boundary, which is why the timestamp is pattern-matched instead.
  assert.equal(parseFeedCursor(`${TS}|${UUID}`)?.createdAt, TS);
});

test("accepts a Z suffix and a missing fraction", () => {
  assert.ok(parseFeedCursor(`2026-09-01T15:26:14.5Z|${UUID}`));
  assert.ok(parseFeedCursor(`2026-09-01T15:26:14+00:00|${UUID}`));
});

test("rejects malformed cursors", () => {
  for (const raw of [
    null,
    "",
    "garbage",
    `${TS}|`,
    `${TS}|not-a-uuid`,
    `2026-09-01 15:26:14+00:00|${UUID}`,
    `9999-99-99T99:99:99Z|${UUID}`,
    // Date.parse rejects a short offset, so the pattern must too - otherwise
    // the two checks would disagree about what a valid cursor is.
    `2026-09-01T15:26:14+00|${UUID}`,
  ]) {
    assert.equal(parseFeedCursor(raw), null, `should reject: ${raw}`);
  }
});

test("rejects attempts to break out of the PostgREST filter", () => {
  // Both halves are interpolated into a filter string that the Supabase client
  // forwards untouched, so a cursor carrying filter syntax could rewrite the
  // WHERE clause rather than just move the page boundary.
  for (const raw of [
    `2026-09-01T15:26:14",id.gt."0|${UUID}`,
    `2026-09-01T15:26:14,or(id.gt.0)|${UUID}`,
    `2026-09-01T15:26:14)|${UUID}`,
    `${TS}|${UUID}",true)--`,
    `${TS}|${UUID},id.gt.0`,
  ]) {
    assert.equal(parseFeedCursor(raw), null, `should reject: ${raw}`);
  }
});

test("builds the keyset filter", () => {
  assert.equal(
    feedKeysetFilter({ createdAt: TS, id: UUID }),
    `created_at.lt."${TS}",and(created_at.eq."${TS}",id.lt."${UUID}")`,
  );
});

test("encode round-trips through parse", () => {
  const encoded = encodeFeedCursor({ created_at: TS, id: UUID });
  assert.deepEqual(parseFeedCursor(encoded), { createdAt: TS, id: UUID });
});

test("encode returns null when created_at is missing", () => {
  assert.equal(encodeFeedCursor({ created_at: 12345, id: UUID }), null);
});
