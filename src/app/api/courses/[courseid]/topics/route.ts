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
    console.log("API - Course ID for topics:", courseid);

    if (!courseid) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    // Get the session cookie from the request headers
    const cookieHeader = request.headers.get("cookie") || undefined;
    const session = await getSessionFromCookies(cookieHeader);
    console.log("API Topics - Session data:", JSON.stringify(session));

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
    console.log("API Topics - Course info:", JSON.stringify(courseInfo));

    if (courseInfo.length === 0) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Get all topics for this course
    const topics = await db.query(
      `SELECT 
        ct.id, 
        ct.topic,
        (SELECT COUNT(*) FROM questions q 
         JOIN question_topic qt ON q.id = qt.question_id 
         WHERE qt.topic_id = ct.id) as total_questions
      FROM course_topics ct
      WHERE ct.course_id = $1
      GROUP BY ct.id, ct.topic`,
      [courseid]
    );
    console.log("API Topics - Raw topics:", JSON.stringify(topics));

    // For each topic, calculate performance metrics
    const topicsWithStats = await Promise.all(
      topics.map(async (topic) => {
        // Get class topic performance data
        const performance = await db.query(
          `SELECT 
            AVG(avg_accuracy) as accuracy,
            MAX(evaluated_at) as last_evaluated
          FROM class_topic_performance
          WHERE topic_id = $1 AND course_id = $2
          GROUP BY topic_id`,
          [topic.id, courseid]
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
          id: topic.id,
          title: topic.topic,
          totalQuestions: parseInt(topic.total_questions || '0'),
          accuracy: accuracyValue,
          lastAccessed
        };
      })
    );
    console.log("API Topics - Processed topics:", JSON.stringify(topicsWithStats));

    // Calculate overall statistics - individual topic accuracies are already in percentage (0-100)
    const overallAccuracy = topicsWithStats.length > 0
      ? Math.round(topicsWithStats.reduce((sum, topic) => sum + topic.accuracy, 0) / topicsWithStats.length)
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
        totalTopics: topicsWithStats.length
      },
      topics: topicsWithStats
    };

    console.log("API Topics - Final response structure:", JSON.stringify(result));
    return NextResponse.json(result);

  } catch (error) {
    console.error("Error fetching topics data:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics data" },
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
    const { topic } = body;

    if (!topic) {
      return NextResponse.json({ error: "Topic Name is required" }, { status: 400 });
    }

    const result = await db.query(
      "INSERT INTO course_topics (topic, course_id) VALUES ($1, $2) RETURNING *",
      [topic, courseId]
    );

    return NextResponse.json({ topic: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating topic:", error);
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
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
    const { topicId } = body;

    if (!topicId) {
      return NextResponse.json({ error: "Topic ID is required" }, { status: 400 });
    }

    await db.query("DELETE FROM course_topics WHERE id = $1 AND course_id = $2", [topicId, courseId]);

    return NextResponse.json({ message: "Topic deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting topic:", error);
    return NextResponse.json({ error: "Failed to delete topic" }, { status: 500 });
  }
}