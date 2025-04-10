import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that should be accessible to the public
const publicPaths = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
];

// Session cookie name
const SESSION_COOKIE_NAME = "quiz_session";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow access to public paths
    if (
        publicPaths.includes(pathname) ||
        pathname.startsWith("/api/") ||
        pathname.startsWith("/_next/") ||
        pathname.startsWith("/static/") ||
        pathname === "/favicon.ico" ||
        pathname === "/robots.txt"
    ) {
        return NextResponse.next();
    }

    // Check if path is protected for staff or students
    const isStaffPath = pathname.startsWith("/staff/");
    const isStudentPath = pathname.startsWith("/student/");

    // If not a protected path, allow access
    if (!isStaffPath && !isStudentPath) {
        return NextResponse.next();
    }

    // Get session cookie
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
        // Redirect to login if not authenticated
        const url = new URL("/login", request.url);
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
    }

    try {
        // In middleware, we can't access the database or use complex auth logic
        // So we'll check session existence and validate role using JWT claims

        // For this simplified version, we'll fetch role from an API route
        const response = await fetch(new URL("/api/auth/me", request.url), {
            headers: {
                cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
            },
        });

        if (!response.ok) {
            // Session invalid - redirect to login
            const url = new URL("/login", request.url);
            return NextResponse.redirect(url);
        }

        const userData = await response.json();
        const userRole = userData.user?.role;

        // Check permissions based on path
        if (isStaffPath && userRole !== "STAFF") {
            // Staff paths can only be accessed by staff members
            return NextResponse.redirect(new URL("/unauthorized", request.url));
        }

        if (isStudentPath && userRole !== "STUDENT") {
            // Student paths can only be accessed by students
            return NextResponse.redirect(new URL("/unauthorized", request.url));
        }

        // User has the correct role, allow access
        return NextResponse.next();
    } catch (error) {
        console.error("Middleware authentication error:", error);

        // On error, redirect to login
        const url = new URL("/login", request.url);
        return NextResponse.redirect(url);
    }
}

// Configure which paths should trigger the middleware
export const config = {
    matcher: [
        // Match student and staff routes
        "/student/:path*",
        "/staff/:path*",
    ],
};
