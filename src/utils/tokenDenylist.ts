import jwt from "jsonwebtoken";

const revokedTokens = new Map<string, number>();

export function revokeToken(token: string) {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresAt =
      decoded?.exp != null
        ? decoded.exp * 1000
        : Date.now() + 7 * 24 * 60 * 60 * 1000;

    revokedTokens.set(token, expiresAt);
  } catch {
    revokedTokens.set(token, Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
}

export function isTokenRevoked(token: string): boolean {
  const expiresAt = revokedTokens.get(token);
  if (!expiresAt) return false;

  if (Date.now() >= expiresAt) {
    revokedTokens.delete(token);
    return false;
  }

  return true;
}

export function cleanupRevokedTokens() {
  const now = Date.now();
  for (const [token, expiresAt] of revokedTokens) {
    if (now >= expiresAt) revokedTokens.delete(token);
  }
}
