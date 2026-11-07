/**
 * V13: Supabase/PostgreSQL errors can contain relation names, SQL snippets,
 * user input and other private deployment information. Keep diagnostics in
 * server logs; only allowlisted error codes and fixed descriptions reach UI.
 */
export function classifyDatabaseError(error, fallback = 'Không thể hoàn tất thao tác.') {
  if (!error) return null;
  const code = typeof error.code === 'string' ? error.code : '';
  let status = 500;
  let publicCode = 'DATABASE_OPERATION_FAILED';
  let publicMessage = fallback;
  if (code === '23505') {
    status = 409; publicCode = 'DUPLICATE_RECORD'; publicMessage = 'Dữ liệu đã tồn tại hoặc thao tác đã được thực hiện.';
  } else if (code === '23503' || code === '23514' || code === '22P02' || code === 'P0001') {
    status = 409; publicCode = 'GAME_RULE_CONFLICT'; publicMessage = 'Không thể thực hiện do trạng thái hoặc quy tắc trò chơi.';
  } else if (code === '42501' || code === 'PGRST301') {
    status = 403; publicCode = 'ACCESS_DENIED'; publicMessage = 'Bạn không có quyền thực hiện thao tác này.';
  } else if (code.startsWith('08') || code === 'PGRST000' || code === 'PGRST002') {
    status = 503; publicCode = 'DATABASE_UNAVAILABLE'; publicMessage = 'Cơ sở dữ liệu tạm thời không khả dụng. Hãy thử lại.';
  } else if (code === '42P01' || code === '42883' || code === 'PGRST202' || code === 'PGRST205') {
    status = 503; publicCode = 'MIGRATION_REQUIRED'; publicMessage = 'Thiếu một phần cấu trúc cơ sở dữ liệu. Hãy kiểm tra migration.';
  }
  return { status, code: publicCode, message: publicMessage };
}

export function throwOnDatabaseError(error, fallback) {
  if (!error) return;
  const safe = classifyDatabaseError(error, fallback);
  const logCode = typeof error.code === 'string' && /^[A-Z0-9]{1,12}$/i.test(error.code) ? error.code : 'UNKNOWN';
  // Log code only. Never dump user-supplied content or full SQL messages.
  console.error('[DB]', logCode, safe.code);
  throw Object.assign(new Error(safe.message), { status: safe.status, code: safe.code });
}

const publicCodes = new Set(['DUPLICATE_RECORD','GAME_RULE_CONFLICT','ACCESS_DENIED','DATABASE_UNAVAILABLE','MIGRATION_REQUIRED','DATABASE_OPERATION_FAILED','AI_NOT_CONFIGURED','AI_GENERATION_FAILED']);

export function toPublicHttpError(error) {
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 && publicCodes.has(error.code)) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return { status: 400, body: { error: 'JSON không hợp lệ.', code: 'INVALID_JSON' } };
  }
  return { status: 500, body: { error: 'Máy chủ gặp lỗi. Hãy thử lại hoặc liên hệ quản trị.', code: 'INTERNAL_ERROR' } };
}
