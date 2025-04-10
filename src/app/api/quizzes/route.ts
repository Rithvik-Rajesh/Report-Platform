import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { generateCacheKey, getCachedData } from "@/lib/cache";

export async function GET(request: NextRequest) {
    try {
        const cookieHeader = request.headers.get("cookie");
        const session = await getSessionFromCookies(cookieHeader);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }
        // Check if the user is a student
        if (session.user.role !== "STUDENT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Generate cache key for student's quizzes
        const cacheKey = generateCacheKey([
            "quizzes",
            `student:${session.user.id}`,
        ]);

        const quizzesData = await getCachedData(cacheKey, async () => {
            // Fetch Quizzes for the student
            const studentId = session.user.id;

            const quizzes = await db.query(
                `
                SELECT q.*
                FROM quizzes q
                JOIN course_student cs ON q.course_id = cs.course_id
                WHERE cs.student_id = $1
            `,
                [studentId],
            );

            if (quizzes.length === 0) {
                return { message: "No quizzes found", quizzes: [] };
            }

            return { quizzes };
        }, 1800); // 30 minutes TTL

        return NextResponse.json(quizzesData);
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        return NextResponse.json({ error: "Failed to fetch quizzes" }, {
            status: 500,
        });
    }
}
