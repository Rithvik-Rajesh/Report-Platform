import { NextResponse, NextRequest } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: { courseid: string } }) {
  try {
    const p = await params;
    const courseId =  p.courseid;

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const course = await db.query("SELECT * FROM courses WHERE id = $1", [courseId]);

    if (course.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const quiz = await db.query("SELECT * FROM quizzes WHERE course_id = $1", [courseId]);

    return NextResponse.json({ quiz: quiz, course: course[0] });
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { courseid: string } }) {
  try {
    const p = await params;
    const courseId = p.courseid;

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, start_time, end_time, duration } = body;
    
    if (!title || !start_time || !end_time || !duration) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const result = await db.query(
      "INSERT INTO quizzes (title, description, start_time, end_time, duration, course_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, description, start_time, end_time, duration, courseId]
    );
    return NextResponse.json({ quiz: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating quiz:", error);
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { courseid: string } }) {
  try {
    const p = await params;
    const courseId = p.courseid;

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { quiz_id } = body;

    if (!quiz_id) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    const result = await db.query(
      "DELETE FROM quizzes WHERE id = $1 RETURNING *",
      [quiz_id]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Quiz deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}