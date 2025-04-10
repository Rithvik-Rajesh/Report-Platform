import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSessionFromCookies } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Get session from cookies
    const session = await getSessionFromCookies(
      request.headers.get("cookie") || "",
    );

    if (!session) {
      // No session to logout, but we can still clear the cookie
      const response = NextResponse.json({ success: true });
      response.headers.set(
        "Set-Cookie",
        "quiz_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
      );
      return response;
    }

    // Delete the session from database
    await deleteSession(session.id);

    // Clear the cookie
    const response = NextResponse.json({ success: true });
    response.headers.set(
      "Set-Cookie",
      "quiz_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
    );

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 },
    );
  }
}
