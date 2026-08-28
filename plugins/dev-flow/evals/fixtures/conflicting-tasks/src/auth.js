// Owned by task A1. Task B1 never touches this file.
export function createSession(userId, expiresAt) {
  return { userId, expiresAt, token: mintToken(userId) };
}

export function mintToken(userId) {
  return `tok_${userId}_${Date.now()}`;
}

export function revokeSession(session) {
  session.expiresAt = 0;
  return session;
}
