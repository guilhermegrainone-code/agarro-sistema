import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION = "7d";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET não configurada no .env");
  }
  return secret;
}

/**
 * Confere email/senha contra as credenciais definidas no .env.
 * Simples de propósito: é um site com um único administrador (você/sua namorada).
 */
export function checkAdminCredentials(email: string, password: string): boolean {
  const validEmail = process.env.ADMIN_EMAIL;
  const validPassword = process.env.ADMIN_PASSWORD;
  if (!validEmail || !validPassword) return false;
  return email.trim().toLowerCase() === validEmail.trim().toLowerCase() && password === validPassword;
}

export function createSessionToken(email: string): string {
  return jwt.sign({ email }, getSecret(), { expiresIn: SESSION_DURATION });
}

export function verifySessionToken(token: string): { email: string } | null {
  try {
    return jwt.verify(token, getSecret()) as { email: string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

/** Usado dentro de Server Components / route handlers para saber se há admin logado. */
export function getSessionFromCookies(): { email: string } | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
