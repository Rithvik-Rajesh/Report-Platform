import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies, getSessionPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        // Get session from cookies
        const session = await getSessionFromCookies(
            request.headers.get("cookie") || "",
        );

        if (!session) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 },
            );
        }

        // Return user data from session
        return NextResponse.json({
            user: getSessionPayload(session),
        });
    } catch (error) {
        console.error("Authentication check error:", error);
        return NextResponse.json(
            { error: "Authentication check failed" },
            { status: 500 },
        );
    }
}
