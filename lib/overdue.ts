/**
 * `content_pieces.status` and `tasks.status` both have 'overdue' as an allowed
 * CHECK-constraint value, but nothing anywhere — no app code path, no
 * trigger, no cron job — ever writes it. Every "X overdue" counter and
 * red/late indicator across the app that filtered on `status === 'overdue'`
 * was therefore permanently dead (always zero / always false), even for
 * content or tasks genuinely past their date. Compute it instead of trusting
 * a stored value nothing ever sets.
 */

const todayStart = () => new Date(new Date().toDateString())

export function isContentOverdue(piece: { status: string; scheduled_date: string | null }): boolean {
  if (piece.status === 'posted' || !piece.scheduled_date) return false
  return new Date(piece.scheduled_date) < todayStart()
}

export function isTaskOverdue(task: { status: string; due_date: string | null }): boolean {
  if (task.status === 'done' || !task.due_date) return false
  return new Date(task.due_date) < todayStart()
}
