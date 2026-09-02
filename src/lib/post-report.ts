/**
 * The report reasons, shared by the API and the UI.
 *
 * The database has the same list in a CHECK constraint. Keeping the labels
 * beside the values here is what stops the two drifting: a reason added to the
 * picker but not the constraint would fail at insert time, and this is the one
 * place to notice that.
 */
export const POST_REPORT_REASONS = [
  { value: "spam", label: "Spam or repetitive posting" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "misinformation", label: "False or misleading claims" },
  { value: "scam", label: "Scam, signal selling or fraud" },
  { value: "off_topic", label: "Not about trading" },
  { value: "other", label: "Something else" },
] as const;

export type PostReportReason = (typeof POST_REPORT_REASONS)[number]["value"];

export const POST_REPORT_NOTE_MAX = 500;

const REASON_VALUES = new Set<string>(
  POST_REPORT_REASONS.map((reason) => reason.value),
);

export function isPostReportReason(value: unknown): value is PostReportReason {
  return typeof value === "string" && REASON_VALUES.has(value);
}

export function postReportReasonLabel(value: string) {
  return (
    POST_REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value
  );
}
