import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET( { params }: { params: { courseId: string, quizId: string } }) {
    try {
        const session = await getSessionFromCookies();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Check if the user is a student
        if (session.user.role !== "STUDENT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const courseId = params.courseId;
        const quizId = params.quizId;

        if (!courseId || !quizId) {
            return NextResponse.json({ error: "Course ID and Quiz ID are required" }, { status: 400 });
        }

        // Fetch the course details
        const course = await db.query("SELECT * FROM courses WHERE id = $1", [courseId]);

        if (course.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Fetch the quiz details
        const quiz = await db.query("SELECT * FROM quizzes WHERE id = $1", [quizId]);
        if (quiz.length === 0) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        // Fetch the quiz topics
        const topics = await db.query("SELECT * FROM quiz_topics WHERE quiz_id = $1", [quizId]);
        if (topics.length > 0) {
            quiz[0].topics = topics;
        } else {
            quiz[0].topics = [];
        }

        return NextResponse.json({ course: course[0], quiz: quiz[0], topics:topics });
    } catch (error) {
        console.error("Error fetching course or quiz:", error);
        return NextResponse.json({ error: "Failed to fetch course or quiz" }, { status: 500 });
    }
}