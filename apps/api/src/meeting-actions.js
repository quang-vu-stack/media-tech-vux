/** v20 VIP: bounded CEO action validation. AI text is an untrusted suggestion. */
export const MAX_MEETING_ACTIONS = 8;
export const MAX_REWARD_VND = 5_000_000;
export const MAX_DURATION_MINUTES = 1_440;

export function validateMeetingAction(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('MEETING_ACTION_INVALID');
  }
  const { clientRequestId, employeeId, title, description = '', rewardVnd, durationMinutes } = input;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof clientRequestId !== 'string' || !uuid.test(clientRequestId) ||
      typeof employeeId !== 'string' || !uuid.test(employeeId) ||
      typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120 ||
      typeof description !== 'string' || description.trim().length > 1000 ||
      !Number.isSafeInteger(rewardVnd) || rewardVnd < 0 || rewardVnd > MAX_REWARD_VND ||
      !Number.isSafeInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
    throw new Error('MEETING_ACTION_INVALID');
  }
  return {
    clientRequestId, employeeId, title: title.trim(), description: description.trim(),
    rewardVnd, durationMinutes,
  };
}

export function publicMeetingAction(item, task) {
  if (!item || !task || task.id !== item.task_id || task.company_id !== item.company_id) {
    throw new Error('MEETING_ACTION_TASK_MISSING');
  }
  return {
    id: item.id,
    meeting_id: item.meeting_id,
    employee_id: item.employee_id,
    client_request_id: item.client_request_id,
    title: item.title,
    description: item.description,
    reward_vnd: item.reward_vnd,
    duration_minutes: item.duration_minutes,
    approved_at: item.approved_at,
    task: {
      id: task.id,
      status: task.status,
      progress: task.progress,
      auto_mode: task.auto_mode,
      due_at: task.due_at,
      completed_at: task.completed_at,
    },
  };
}
