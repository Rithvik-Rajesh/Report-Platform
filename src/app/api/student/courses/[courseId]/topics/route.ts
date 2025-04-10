import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET({ params }: { params: { courseId: string } }) {
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

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        // Fetch the course details
        const course = await db.query("SELECT * FROM courses WHERE id = $1", [courseId]);

        if (course.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Fetch the course topics
        const topics = await db.query("SELECT * FROM course_topics WHERE course_id = $1", [courseId]);
        if (topics.length > 0) {
            course[0].topics = topics;
        } else {
            course[0].topics = [];
        }

        return NextResponse.json({ course: course[0] });
    } catch (error) {
        console.error("Error fetching course:", error);
        return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
    }
}