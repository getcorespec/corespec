export interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
}

const sessions = new Map<string, Session>();

export function createSession(userId: string, token: string, ttlMs = 3600000): Session {
  const session: Session = {
    userId,
    token,
    expiresAt: new Date(Date.now() + ttlMs),
  };
  sessions.set(token, session);
  return session;
}

export function getSession(token: string): Session | undefined {
  const session = sessions.get(token);
  if (!session) return undefined;
  if (session.expiresAt < new Date()) {
    sessions.delete(token);
    return undefined;
  }
  return session;
}

export function revokeSession(token: string): boolean {
  return sessions.delete(token);
}
