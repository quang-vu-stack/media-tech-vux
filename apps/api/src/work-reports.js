/** v21: review validation; database RPC is authoritative for money and task state. */
export const REVIEW_DECISIONS = Object.freeze(['approve', 'revise', 'reject']);
export const MAX_REPORT_REVISIONS = 3;

export function validateWorkReportReview(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('REPORT_REVIEW_INVALID');
  const { decision, notes = '', expectedRevision } = input;
  if (!REVIEW_DECISIONS.includes(decision) || typeof notes !== 'string' || notes.trim().length > 1000 ||
      (decision === 'revise' && notes.trim().length < 8) ||
      !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision > MAX_REPORT_REVISIONS) {
    throw new Error('REPORT_REVIEW_INVALID');
  }
  return { decision, notes: notes.trim(), expectedRevision };
}

export function publicWorkReport(report, action) {
  if (report === null || report === undefined) return null;
  if (!action || report.action_id !== action.id || report.task_id !== action.task_id || report.company_id !== action.company_id) {
    throw new Error('WORK_REPORT_ACTION_MISMATCH');
  }
  return {
    id: report.id,
    status: report.status,
    revision_no: report.revision_no,
    content: report.content,
    review_notes: report.review_notes,
    source: report.source,
    submitted_at: report.submitted_at,
    reviewed_at: report.reviewed_at,
  };
}
