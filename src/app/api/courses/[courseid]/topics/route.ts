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
    const { courseid } = await params;

    if (!courseid) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    const session = await getSessionFromCookies();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all topics for this course
    const topics = await db.query(
      `SELECT 
        ct.id, 
        ct.topic,
        COALESCE(
          (SELECT COUNT(*) FROM questions q 
           JOIN question_topic qt ON q.id = qt.question_id 
           WHERE qt.topic_id = ct.id), 0
        ) as total_questions,
        to_char(MAX(qa.created_at), 'Mon DD, YYYY') as last_accessed
      FROM course_topics ct
      LEFT JOIN question_topic qt ON ct.id = qt.topic_id
      LEFT JOIN quiz_attempts qa ON qa.topic_id = ct.id
      WHERE ct.course_id = $1
      GROUP BY ct.id, ct.topic`,
      [courseid]
    );

    // Get course information
    const courseInfo = await db.query(
      `SELECT name, code, description 
       FROM courses 
       WHERE id = $1`,
      [courseid]
    );

    if (courseInfo.length === 0) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Get stats for each topic
    const topicsWithStats = await Promise.all(
      topics.map(async (topic) => {
        const stats = await db.query(
          `SELECT 
            COALESCE(AVG(
              CASE WHEN qa.is_correct = true THEN 100.0 ELSE 0.0 END
            ), 0) as accuracy,
            COALESCE(
              COUNT(DISTINCT qa.question_id) * 100.0 / 
              NULLIF((SELECT COUNT(*) FROM questions q 
                     JOIN question_topic qt ON q.id = qt.question_id 
                     WHERE qt.topic_id = $1), 0),
              0
            ) as completion_rate
          FROM quiz_attempts qa
          WHERE qa.topic_id = $1`,
          [topic.id]
        );

        return {
          id: topic.id,
          title: topic.topic,
          totalQuestions: parseInt(topic.total_questions),
          accuracy: parseFloat(stats[0].accuracy || 0),
          completionRate: parseFloat(stats[0].completion_rate || 0),
          lastAccessed: topic.last_accessed || "Not accessed yet",
        };
      })
    );

    // Calculate overall course stats
    const overallAccuracy = topicsWithStats.length > 0
      ? topicsWithStats.reduce((sum, topic) => sum + topic.accuracy, 0) / topicsWithStats.length
      : 0;

    const overallCompletion = topicsWithStats.length > 0
      ? topicsWithStats.reduce((sum, topic) => sum + topic.completionRate, 0) / topicsWithStats.length
      : 0;

    return NextResponse.json({
      course: {
        id: courseid,
        name: courseInfo[0].name,
        code: courseInfo[0].code,
        description: courseInfo[0].description
      },
      statistics: {
        overallAccuracy,
        overallCompletion,
        totalTopics: topicsWithStats.length
      },
      topics: topicsWithStats
    });

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