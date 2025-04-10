import { NextResponse, NextRequest } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: { courseid: string } }) {
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
      
    const courseStaff = await db.query(
      "SELECT * FROM course_staff WHERE course_id = $1",
      [courseId]
    );
    const courseStudents = await db.query(
      "SELECT * FROM course_student WHERE course_id = $1",
      [courseId]
    );

    
      const courseStaffIds = courseStaff.map((staff) => staff.staff_id);
      const courseStudentIds = courseStudents.map((student) => student.student_id);
      
      if (courseStaffIds.length === 0 && courseStudentIds.length === 0) {
        return NextResponse.json({ course: course[0], courseStaff: [], courseStudents: [] });
      }
    
      const courseStaffDetails = await db.query(
      "SELECT * FROM users WHERE id = ANY($1)",
      [courseStaffIds]
    );
    
      const courseStudentDetails = await db.query(
      "SELECT * FROM users WHERE id = ANY($1)",
      [courseStudentIds]
    );
      
      return NextResponse.json({ course: course[0], courseStaff: courseStaffDetails, courseStudents: courseStudentDetails });
      
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
        const { student_id } = body;

        if (!student_id) {
            return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
        }

        const result = await db.query(
            "INSERT INTO course_student (student_id, course_id) VALUES ($1, $2) RETURNING *",
            [student_id, courseId]
        );

        return NextResponse.json({ student: result[0] }, { status: 201 });
    } catch (error) {
        console.error("Error adding student to course:", error);
        return NextResponse.json({ error: "Failed to add student to course" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { courseid: string } }) {
    try {
        const p = await params;
        const courseId = p.courseid;
    
        const studentId = request.headers.get("student_id");

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        const result = await db.query(
            "DELETE FROM course_student WHERE student_id = $1 AND course_id = $2 RETURNING *",
            [studentId, courseId]
        );

        if (result.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Student removed from Course successfully" });
    } catch (error) {
        console.error("Error deleting course:", error);
        return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }
}

