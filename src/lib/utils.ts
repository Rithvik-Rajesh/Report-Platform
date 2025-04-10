import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a random session id using Web Crypto API (compatible with Edge Runtime)
export function generateSessionId(): string {
  // Use crypto.randomUUID() which is available in both browser and Edge runtime
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for environments without randomUUID
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((val) => val.toString(16).padStart(2, "0"))
    .join("");
}

// Hash a password - NOTE: This should only be used server-side in Node.js environment
export async function hashPassword(password: string): Promise<string> {
  // This function must only be called from Node.js environment, not middleware
  const bcrypt = require("bcryptjs");
  return bcrypt.hash(password, 10);
}

// Verify a password - NOTE: This should only be used server-side in Node.js environment
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  // This function must only be called from Node.js environment, not middleware
  const bcrypt = require("bcryptjs");
  return bcrypt.compare(password, hashedPassword);
}

// Parse a cookie string
export function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;

  cookieString.split(";").forEach((cookie) => {
    const [name, value] = cookie.split("=").map((c) => c.trim());
    if (name && value) cookies[name] = value;
  });

  return cookies;
}

// Set a secure HTTP-only cookie
export function setCookie(
  name: string,
  value: string,
  options: Record<string, any> = {},
): string {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    ...options,
  };

  let cookie = `${name}=${value}`;

  Object.entries(cookieOptions).forEach(([key, value]) => {
    if (value === true) {
      cookie += `; ${key}`;
    } else if (value !== false && value !== undefined) {
      cookie += `; ${key}=${value}`;
    }
  });

  return cookie;
}

// Create a session cookie
export function createSessionCookie(sessionId: string): string {
  const cookie =
    `quiz_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`; // 7 days
  return cookie;
}
