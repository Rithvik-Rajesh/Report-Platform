import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { courseid: string } },
) {
  try {
    const awaitedParams = await params;
    const { courseid } = awaitedParams;

    if (!courseid) {
      return NextResponse.json({ error: "Course ID is required" }, {
        status: 400,
      });
    }

    const course = await db.query("SELECT * FROM courses WHERE id = $1", [
      courseid,
    ]);

    if (course.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Get quiz statistics
    const quizStats = await db.query(
      `
      SELECT 
        q.id,
        q.title,
        q.description,
        q.start_time as start_date,
        q.end_time as end_date,
        q.duration,
        MAX(r.score) as highest_score,
        MIN(r.score) as lowest_score,
        AVG(r.score) as average_score
      FROM quizzes q
      LEFT JOIN quiz_results r ON q.id = r.quiz_id
      WHERE q.course_id = $1
      GROUP BY q.id, q.title, q.description, q.start_time, q.end_time, q.duration
      ORDER BY q.start_time ASC
    `,
      [courseid],
    );

    return NextResponse.json({
      course: course[0],
      quizStats: quizStats.map((quiz) => ({
        ...quiz,
        start_date: new Date(quiz.start_date).toLocaleDateString(),
        end_date: new Date(quiz.end_date).toLocaleDateString(),
        average_score: Math.round(quiz.average_score || 0),
      })),
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseid: string } },
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseid = params.courseid;
    if (!courseid) {
      return NextResponse.json({ error: "Course ID is required" }, {
        status: 400,
      });
    }

    const body = await request.json();
    const { name, code, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, {
        status: 400,
      });
    }

    const result = await db.query(
      "UPDATE courses SET name = $1, code = $2, description = $3 WHERE id = $4 RETURNING *",
      [name, code, description, courseid],
    );

    if (result.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }
}
