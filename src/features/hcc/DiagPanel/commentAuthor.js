// Authorship rules for Diagnosis Gap comments.
//
// A stored comment carries `author` (display name) and `authorId` (profiles.id,
// stamped server-side by hcc_diag_comment_author_migration.sql). "You" is a
// viewer-relative label: it is only ever computed at render time, never stored.
//
// Legacy rows written before the migration stored the literal 'You' with no
// author id. That string identifies nobody, so those rows render as
// "Unknown author" and are not editable by anyone.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a real profiles.id. The mention roster falls back to plain names
 *  for staff without a login, which must not reach the uuid[] column. */
export function isProfileId(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

/** The signed-in user's authorship fields for a new comment. */
export function currentAuthor(profile) {
  return {
    author: profile?.name || null,
    authorId: isProfileId(profile?.id) ? profile.id : null,
  };
}

/** Picked mention chips → profile ids only, deduped. */
export function mentionProfileIds(mentions) {
  return [...new Set((mentions || []).map((m) => m?.id).filter(isProfileId))];
}

export function isCommentMine(comment, me) {
  if (!comment?.authorId || !me?.id) return false;
  return comment.authorId === me.id;
}

export function commentAuthorLabel(comment, me) {
  if (isCommentMine(comment, me)) return 'You';
  if (!comment?.author || comment.author === 'You') return 'Unknown author';
  return comment.author;
}
