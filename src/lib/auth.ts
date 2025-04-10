import db from "./db";
import { Session, SessionPayload, User } from "./types";
import { generateSessionId, parseCookies, verifyPassword } from "./utils";
import { generateCacheKey, getCachedData } from "./cache";

// Session cookie name
const SESSION_COOKIE_NAME = "quiz_session";

// Create a new session for a user
export async function createSession(user: User): Promise<string> {
  const sessionId = generateSessionId();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7); // Session expires in 7 days

  try {
    // Store session in database
    await db.query(
      "INSERT INTO sessions (id, user_id, expires) VALUES ($1, $2, $3)",
      [sessionId, user.id, expires],
    );

    return sessionId;
  } catch (error) {
    console.error("Error creating session:", error);
    throw new Error("Failed to create session");
  }
}

// Get session by id
export async function getSession(sessionId: string): Promise<Session | null> {
  // Generate cache key for session
  const cacheKey = generateCacheKey(["session", sessionId]);

  return await getCachedData(cacheKey, async () => {
    try {
      const result = await db.query(
        "SELECT s.id, s.user_id, s.expires, u.id as user_id, u.name, u.email, u.roll_no, u.role FROM sessions s " +
          "JOIN users u ON s.user_id = u.id " +
          "WHERE s.id = $1 AND s.expires > NOW()",
        [sessionId],
      );

      if (result.length === 0) return null;

      const sessionData = result[0];
      const user: User = {
        id: sessionData.user_id,
        name: sessionData.name,
        email: sessionData.email,
        roll_no: sessionData.roll_no,
        role: sessionData.role,
        password: sessionData.password,
        created_at: sessionData.created_at,
        updated_at: sessionData.updated_at,
      };

      const session: Session = {
        id: sessionData.id,
        userId: sessionData.user_id,
        expires: sessionData.expires,
        user,
      };

      return session;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }, 1800); // 30 minutes TTL
}

// Delete a session
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    await db.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
    // Invalidate session cache
    await redis.del(generateCacheKey(["session", sessionId]));
    return true;
  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
}

// Get session from request cookies
export async function getSessionFromCookies(
  cookie?: string,
): Promise<Session | null> {
  try {
    if (!cookie) return null;

    const cookies = parseCookies(cookie);
    const sessionId = cookies[SESSION_COOKIE_NAME];

    if (!sessionId) return null;

    return await getSession(sessionId);
  } catch (error) {
    console.error("Error getting session from cookies:", error);
    return null;
  }
}

// Get session payload from session
export function getSessionPayload(session: Session): SessionPayload {
  if (!session.user) throw new Error("Session user data missing");

  return {
    id: typeof session.user.id === "string"
      ? parseInt(session.user.id, 10)
      : session.user.id,
    name: session.user.name,
    email: session.user.email,
    roll_no: session.user.roll_no,
    role: session.user.role,
  };
}

// Login a user with email and password
export async function login(
  email: string,
  password: string,
): Promise<User | null> {
  try {
    const result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (result.length === 0) return null;

    const user = result[0];
    const passwordValid = await verifyPassword(password, user.password);

    if (!passwordValid) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roll_no: user.roll_no,
      role: user.role,
      password: user.password,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  } catch (error) {
    console.error("Error during login:", error);
    return null;
  }
}
