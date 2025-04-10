import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import db from "@/lib/db";


export async function GET(request: Request) {
    try {
        console.log('GET /api/student/courses - Request headers:', request.headers);
        const cookieHeader = request.headers.get('cookie');
        if (!cookieHeader) {
            console.log('GET /api/courses - No cookie header found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await getSessionFromCookies(cookieHeader);
        console.log('GET /api/courses - Session:', session);
        // Check if the user is a student
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const users = await db.query('SELECT * FROM users WHERE id = $1', [session.userId]);
        const user = users[0];
        console.log('GET /api/courses - User:', user);

        if (!user || user.role !== "STUDENT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch courses for the student
        const studentId = user.id;
        const coursesResult = await db.query(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM course_student WHERE course_id = c.id) as student_count,
             (SELECT COUNT(*) FROM course_topics WHERE course_id = c.id) as topic_count,
             u.name as instructor_name
      FROM courses c 
      JOIN course_student cs ON c.id = cs.course_id 
      JOIN course_staff cs2 ON c.id = cs2.course_id
      LEFT JOIN users u ON cs2.staff_id = u.id
      WHERE cs.student_id = $1
      ORDER BY c.created_at DESC
      `, [studentId]);


        if (coursesResult.length === 0) {
            return NextResponse.json({ message: "No courses found" }, { status: 404 });
        }

        return NextResponse.json({ courses: coursesResult });
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}