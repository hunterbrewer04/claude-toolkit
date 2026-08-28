// Owned by NEITHER task. This is the collision point:
// it depends on both auth.js and api.js, so a change to either reaches here.
// File lists say A1 and B1 are safe to parallelize. They are not.
import { createSession, revokeSession } from './auth.js';
import { requireSameOrigin } from './api.js';

export function refreshPortalSession(req, session) {
  if (!requireSameOrigin(req)) {
    return revokeSession(session);
  }
  return createSession(session.userId, Date.now() + 1800_000);
}
