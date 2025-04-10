import { NextResponse } from "next/server";

import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getSessionFromCookies();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Check if the user is a student
        if (session.user.role !== "STUDENT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch Quizzes for the student
        const studentId = session.user.id;

        const quizzes = await db.query(`
            SELECT q.*
            FROM quizzes q
            JOIN  course_student cs ON q.course_id = cs.course_id
            WHERE cs.student_id = $1
        `, [studentId]);
        if (quizzes.length === 0) {
            return NextResponse.json({ message: "No quizzes found" }, { status: 404 });
        }

    } catch (error) {
        console.error("Error fetching course:", error);
        return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
    }
}