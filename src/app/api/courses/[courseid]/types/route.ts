import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET({ params }: { params: { courseid: string } }) {
  try {

    const p = await params;
    const courseId = p.courseid;

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const course = await db.query("SELECT * FROM courses WHERE id = $1", [courseId]);

    if (course.length === 0) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
      
    const types = await db.query("SELECT * FROM course_types WHERE course_id = $1", [courseId]);

    return NextResponse.json({ types: types, course: course[0] });
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
    const { type } = body;

    if (!type) {
      return NextResponse.json({ error: "type Name is required" }, { status: 400 });
    }

    const result = await db.query(
      "INSERT INTO course_types (type, course_id) VALUES ($1, $2) RETURNING *",
      [type, courseId]
    );

    return NextResponse.json({ type: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating type:", error);
    return NextResponse.json({ error: "Failed to create type" }, { status: 500 });
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
    const { typeId } = body;

    if (!typeId) {
      return NextResponse.json({ error: "type ID is required" }, { status: 400 });
    }

    await db.query("DELETE FROM course_types WHERE id = $1 AND course_id = $2", [typeId, courseId]);

    return NextResponse.json({ message: "type deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting type:", error);
    return NextResponse.json({ error: "Failed to delete type" }, { status: 500 });
  }
}