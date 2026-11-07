// Game-level rules mirrored by SQL transaction procedures.
// These helpers do not authorize operations; server and SQL check ownership.
export function canRelease(project, version) {
  return !!(project && version && project.status === 'approved' &&
    project.current_version === version.version_number &&
    project.published_version !== project.current_version &&
    version.quality_report?.passed === true &&
    /^[0-9a-f]{64}$/.test(version.quality_report.source_sha256 || ''));
}
export function canRollback(project, target, releasedHistory) {
  return !!(project && Number.isInteger(target) && target > 0 &&
    project.published_version != null && project.published_version !== target &&
    releasedHistory.some(entry => entry.action === 'release' && entry.version_number === target));
}
export function publicReleaseSummary(project, history) {
  return {
    project_id: project.id,
    active_version: project.published_version ?? null,
    events: history.map(({id,version_number,action,source_sha256,note,created_at}) =>
      ({id,version_number,action,source_sha256,note,created_at})),
  };
}
