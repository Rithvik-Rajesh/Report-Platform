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

        const url = new URL(request.url);
        const courseId = url.searchParams.get("courseId");
        const quizId = url.searchParams.get("quizId");

        if (!courseId || !quizId) {
            return NextResponse.json({
                error: "Course ID and Quiz ID are required",
            }, { status: 400 });
        }

        // Generate cache key
        const cacheKey = generateCacheKey([
            "topics",
            `course:${courseId}`,
            `quiz:${quizId}`,
            `student:${session.user.id}`,
        ]);

        const topicsData = await getCachedData(cacheKey, async () => {
            // Fetch the course details
            const course = await db.query(
                "SELECT * FROM courses WHERE id = $1",
                [courseId],
            );

            if (course.length === 0) {
                return null;
            }

            // Fetch the quiz details
            const quiz = await db.query("SELECT * FROM quizzes WHERE id = $1", [
                quizId,
            ]);
            if (quiz.length === 0) {
                return { error: "Quiz not found", status: 404 };
            }

            // Fetch the quiz topics
            const topics = await db.query(
                "SELECT * FROM quiz_topics WHERE quiz_id = $1",
                [quizId],
            );

            return { course: course[0], quiz: quiz[0], topics: topics };
        }, 1800); // 30 minutes TTL

        if (!topicsData) {
            return NextResponse.json({ error: "Course not found" }, {
                status: 404,
            });
        }

        if (topicsData.error) {
            return NextResponse.json({ error: topicsData.error }, {
                status: topicsData.status || 400,
            });
        }

        return NextResponse.json(topicsData);
    } catch (error) {
        console.error("Error fetching course or quiz:", error);
        return NextResponse.json({ error: "Failed to fetch course or quiz" }, {
            status: 500,
        });
    }
}
