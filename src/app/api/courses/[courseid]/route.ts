import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { generateCacheKey, getCachedData, invalidateCache } from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: { courseid: string } },
) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const session = await getSessionFromCookies(cookieHeader);
    console.log("API - Session data:", JSON.stringify(session));

    const awaitedParams = await params;
    const { courseid } = awaitedParams;
    console.log("API - Course ID:", courseid);

    if (!courseid) {
      return NextResponse.json({ error: "Course ID is required" }, {
        status: 400,
      });
    }

    // Generate cache key - different keys for different user roles
    const userRole = session?.user?.role || session?.role || "anonymous";
    const userId = session?.user?.id || session?.userId || "guest";
    const cacheKey = generateCacheKey([
      "course",
      courseid,
      `user:${userId}`,
      `role:${userRole}`,
    ]);

    const courseData = await getCachedData(cacheKey, async () => {
      const course = await db.query("SELECT * FROM courses WHERE id = $1", [
        courseid,
      ]);
      console.log("API - Course data:", JSON.stringify(course));

      if (course.length === 0) {
        return null;
      }

      // Get quiz statistics correctly - calculate quiz total marks
      const quizStats = await db.query(
        `
        SELECT 
          q.id,
          q.title,
          q.description,
          q.start_time,
          q.end_time,
          q.duration,
          (SELECT SUM(questions.score) FROM questions WHERE questions.quiz_id = q.id) as total_marks,
          (SELECT MAX(qr.score) FROM quiz_results qr WHERE qr.quiz_id = q.id) as highest_score,
          (SELECT MIN(qr.score) FROM quiz_results qr WHERE qr.quiz_id = q.id) as lowest_score,
          (SELECT AVG(qr.score) FROM quiz_results qr WHERE qr.quiz_id = q.id) as average_score
        FROM quizzes q
        WHERE q.course_id = $1
        GROUP BY q.id, q.title, q.description, q.start_time, q.end_time, q.duration
        ORDER BY q.start_time ASC
      `,
        [courseid],
      );
      console.log("API - Quiz stats before processing:", JSON.stringify(quizStats));

      const processedQuizStats = quizStats.map((quiz) => {
        // Calculate percentages based on total marks
        const totalMarks = parseInt(quiz.total_marks) || 100; // Default to 100 if no total

        // Make sure all scores are parsed as numbers
        const highestScore = parseFloat(quiz.highest_score) || 0;
        const lowestScore = parseFloat(quiz.lowest_score) || 0;
        const averageScore = parseFloat(quiz.average_score) || 0;

        console.log(`API - Processing quiz ${quiz.id}: Total marks=${totalMarks}, Highest=${highestScore}, Lowest=${lowestScore}, Avg=${averageScore}`);

        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          start_time: quiz.start_time,
          end_time: quiz.end_time,
          duration: quiz.duration,
          marks: totalMarks,
          highest_score: highestScore,
          lowest_score: lowestScore,
          average_score: averageScore,
          // Calculate percentages properly
          highest_score_percent: Math.round((highestScore / totalMarks) * 100),
          lowest_score_percent: Math.round((lowestScore / totalMarks) * 100),
          average_score_percent: Math.round((averageScore / totalMarks) * 100)
        };
      });
      console.log("API - Processed quiz stats:", JSON.stringify(processedQuizStats));

      return {
        course: course[0],
        quizStats: processedQuizStats,
      };
    }, 3600); // 1 hour TTL

    if (!courseData) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    console.log("API - Final response data:", JSON.stringify(courseData));
    return NextResponse.json(courseData);
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
    const cookieHeader = request.headers.get("cookie") || undefined;
    const session = await getSessionFromCookies(cookieHeader);
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

    // Invalidate all cache entries related to this course
    await invalidateCache(`course:${courseid}:*`);
    await invalidateCache(`courses:*`);

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }
}
