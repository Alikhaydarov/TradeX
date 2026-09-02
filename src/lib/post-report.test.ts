import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  isPostReportReason,
  POST_REPORT_REASONS,
  postReportReasonLabel,
} from "./post-report";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/202609010003_post_reports.sql",
);

test("the reason list matches the database CHECK constraint", () => {
  // These two lists are the drift risk in this feature: a reason added to the
  // picker but not to the constraint looks fine in review and fails only when
  // someone actually files that report. Reading the migration is what makes
  // that a test failure instead of a production one.
  const sql = readFileSync(MIGRATION, "utf8");
  const clause = sql.match(/reason in \(([^)]+)\)/);
  assert.ok(clause, "could not find the reason CHECK constraint");

  const fromSql = clause[1]
    .split(",")
    .map((value) => value.trim().replace(/^'|'$/g, ""))
    .filter(Boolean)
    .sort();

  const fromCode = POST_REPORT_REASONS.map((reason) => reason.value).sort();

  assert.deepEqual(fromCode, fromSql);
});

test("every reason has a distinct value and a label", () => {
  const values = POST_REPORT_REASONS.map((reason) => reason.value);
  assert.equal(new Set(values).size, values.length, "duplicate reason value");
  for (const reason of POST_REPORT_REASONS) {
    assert.ok(reason.label.trim().length > 0, `${reason.value} has no label`);
  }
});

test("only known reasons are accepted", () => {
  for (const reason of POST_REPORT_REASONS) {
    assert.ok(isPostReportReason(reason.value));
  }
  for (const value of ["", "SPAM", "spam ", "drop table", null, undefined, 7, {}]) {
    assert.equal(isPostReportReason(value), false, `should reject: ${String(value)}`);
  }
});

test("an unknown reason renders as itself rather than blank", () => {
  // The queue shows whatever the row holds. If a reason is ever removed from
  // the list, old rows should still read as something.
  assert.equal(postReportReasonLabel("spam"), "Spam or repetitive posting");
  assert.equal(postReportReasonLabel("retired_reason"), "retired_reason");
});
