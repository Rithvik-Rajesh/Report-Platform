import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: {
    params: {
      courseid: string;
    }
  }
) {
  try {
    const { courseid } = params;
    console.log("API - Course ID for types:", courseid);

    if (!courseid) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    // Get the session cookie from the request headers
    const cookieHeader = request.headers.get("cookie") || undefined;
    const session = await getSessionFromCookies(cookieHeader);
    console.log("API types - Session data:", JSON.stringify(session));

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get course information
    const courseInfo = await db.query(
      `SELECT id, name, code, description 
       FROM courses 
       WHERE id = $1`,
      [courseid]
    );
    console.log("API types - Course info:", JSON.stringify(courseInfo));

    if (courseInfo.length === 0) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Get all types for this course
    const types = await db.query(
      `SELECT 
        ct.id, 
        ct.type,
        (SELECT COUNT(*) FROM questions q 
         JOIN question_type qt ON q.id = qt.question_id 
         WHERE qt.type_id = ct.id) as total_questions
      FROM course_types ct
      WHERE ct.course_id = $1
      GROUP BY ct.id, ct.type`,
      [courseid]
    );
    console.log("API types - Raw types:", JSON.stringify(types));

    // For each type, calculate performance metrics
    const typesWithStats = await Promise.all(
      types.map(async (type) => {
        // Get class type performance data
        const performance = await db.query(
          `SELECT 
            AVG(avg_accuracy) as accuracy,
            MAX(evaluated_at) as last_evaluated
          FROM class_type_performance
          WHERE type_id = $1 AND course_id = $2
          GROUP BY type_id`,
          [type.id, courseid]
        );

        // Format last evaluated date
        const lastAccessed = performance.length > 0 && performance[0].last_evaluated
          ? new Date(performance[0].last_evaluated).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
          : "Not accessed yet";

        // Calculate accuracy - ensure we multiply by 100 for percentage display and convert to integer
        const accuracyValue = performance.length > 0 && performance[0].accuracy
          ? Math.round(parseFloat(performance[0].accuracy) * 100)
          : 0;

        return {
          id: type.id,
          title: type.type,
          totalQuestions: parseInt(type.total_questions || '0'),
          accuracy: accuracyValue,
          lastAccessed
        };
      })
    );
    console.log("API types - Processed types:", JSON.stringify(typesWithStats));

    // Calculate overall statistics - individual type accuracies are already in percentage (0-100)
    const overallAccuracy = typesWithStats.length > 0
      ? Math.round(typesWithStats.reduce((sum, type) => sum + type.accuracy, 0) / typesWithStats.length)
      : 0;

    const result = {
      course: {
        id: courseid,
        name: courseInfo[0].name,
        code: courseInfo[0].code,
        description: courseInfo[0].description
      },
      statistics: {
        overallAccuracy,
        totaltypes: typesWithStats.length
      },
      types: typesWithStats
    };

    console.log("API types - Final response structure:", JSON.stringify(result));
    return NextResponse.json(result);

  } catch (error) {
    console.error("Error fetching types data:", error);
    return NextResponse.json(
      { error: "Failed to fetch types data" },
      { status: 500 }
    );
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