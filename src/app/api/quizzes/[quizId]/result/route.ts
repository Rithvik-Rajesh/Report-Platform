import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: { quizId: string } }
) {
    try {
        const { quizId } = params;
        console.log("GET /api/quizzes/[quizId]/result - Quiz ID:", quizId);

        if (!quizId) {
            return NextResponse.json(
                { error: "Quiz ID is required" },
                { status: 400 }
            );
        }

        const cookieHeader = request.headers.get("cookie") || undefined;
        const session = await getSessionFromCookies(cookieHeader);
        console.log("GET /api/quizzes/[quizId]/result - Session:", session);

        // Check authentication
        let isAuthenticated = false;
        if (session) {
            if (session.user) {
                isAuthenticated = true;
            } else if ((session as any).userId) {
                isAuthenticated = true;
            }
        }

        if (!isAuthenticated) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 1. Get basic quiz information
        const quizInfo = await db.query(
            `SELECT 
        q.id, 
        q.title, 
        q.description, 
        q.duration,
        q.start_time,
        q.end_time,
        c.id as course_id,
        c.name as course_name,
        c.code as course_code
      FROM quizzes q
      JOIN courses c ON q.course_id = c.id
      WHERE q.id = $1`,
            [quizId]
        );

        if (!quizInfo || quizInfo.length === 0) {
            return NextResponse.json(
                { error: "Quiz not found" },
                { status: 404 }
            );
        }

        // 2. Get total questions and marks
        const totalQuestions = await db.query(
            `SELECT 
        COUNT(*) as count,
        SUM(score) as total_marks
      FROM questions
      WHERE quiz_id = $1`,
            [quizId]
        );

        // 3. Get student performance data
        const studentPerformance = await db.query(
            `SELECT 
        u.roll_no as roll_no,
        u.name as name,
        qr.score as marks,
        COUNT(DISTINCT qa.question_id) as questions_attempted
      FROM quiz_results qr
      JOIN students s ON qr.student_id = s.id
      JOIN users u ON s.id = u.id
      LEFT JOIN quiz_attempts qa ON qr.student_id = qa.student_id AND qr.quiz_id = qa.quiz_id
      WHERE qr.quiz_id = $1
      GROUP BY u.roll_no, u.name, qr.score
      ORDER BY qr.score DESC`,
            [quizId]
        );

        // 4. Get question performance data
        const questionPerformance = await db.query(
            `SELECT 
        q.id,
        q.question,
        COUNT(DISTINCT qa.id) as total_attempts,
        COUNT(DISTINCT CASE WHEN qo.is_correct = true AND qo.id = qa.selected_option THEN qa.id END) as correct_answers
      FROM questions q
      LEFT JOIN quiz_attempts qa ON q.id = qa.question_id
      LEFT JOIN question_option qo ON qa.selected_option = qo.id
      WHERE q.quiz_id = $1
      GROUP BY q.id, q.question
      ORDER BY q.id`,
            [quizId]
        );

        // 5. Get topic performance data
        const topicPerformance = await db.query(
            `WITH topic_data AS (
        SELECT 
          ct.topic,
          q.id as question_id,
          COUNT(DISTINCT qa.id) as total_attempts,
          COUNT(DISTINCT CASE WHEN qo.is_correct = true AND qo.id = qa.selected_option THEN qa.id END) as correct_answers
        FROM questions q
        JOIN question_topic qt ON q.id = qt.question_id
        JOIN course_topics ct ON qt.topic_id = ct.id
        LEFT JOIN quiz_attempts qa ON q.id = qa.question_id
        LEFT JOIN question_option qo ON qa.selected_option = qo.id
        WHERE q.quiz_id = $1
        GROUP BY ct.topic, q.id
      )
      SELECT 
        topic,
        ROUND(AVG(CASE WHEN total_attempts > 0 THEN (correct_answers * 100.0 / total_attempts) ELSE 0 END)) as avg_score
      FROM topic_data
      GROUP BY topic
      ORDER BY avg_score DESC`,
            [quizId]
        );

        // 6. Get question type performance data (if exists in schema)
        const typePerformance = await db.query(
            `WITH type_data AS (
        SELECT 
          ct.type,
          q.id as question_id,
          COUNT(DISTINCT qa.id) as total_attempts,
          COUNT(DISTINCT CASE WHEN qo.is_correct = true AND qo.id = qa.selected_option THEN qa.id END) as correct_answers
        FROM questions q
        JOIN question_type qt ON q.id = qt.question_id
        JOIN course_types ct ON qt.type_id = ct.id
        LEFT JOIN quiz_attempts qa ON q.id = qa.question_id
        LEFT JOIN question_option qo ON qa.selected_option = qo.id
        WHERE q.quiz_id = $1
        GROUP BY ct.type, q.id
      )
      SELECT 
        type,
        ROUND(AVG(CASE WHEN total_attempts > 0 THEN (correct_answers * 100.0 / total_attempts) ELSE 0 END)) as avg_score
      FROM type_data
      GROUP BY type
      ORDER BY avg_score DESC`,
            [quizId]
        );

        // 7. Calculate average mark and format data
        const totalStudents = studentPerformance.length;
        const avgMark = totalStudents > 0
            ? Math.round(studentPerformance.reduce((sum, s) => sum + parseFloat(s.marks), 0) / totalStudents * 10) / 10
            : 0;

        // Format date and time for display
        const formatDateTime = (dateTimeStr: string) => {
            if (!dateTimeStr) return "";
            const date = new Date(dateTimeStr);
            return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        };

        // 8. Prepare and return the combined data
        const response = {
            quizInfo: {
                id: quizInfo[0].id,
                title: quizInfo[0].title,
                description: quizInfo[0].description,
                duration: `${quizInfo[0].duration} minutes`,
                startTime: formatDateTime(quizInfo[0].start_time),
                endTime: formatDateTime(quizInfo[0].end_time),
                totalMarks: parseInt(totalQuestions[0].total_marks) || 0,
                totalQuestions: parseInt(totalQuestions[0].count) || 0,
                courseId: quizInfo[0].course_id,
                courseName: quizInfo[0].course_name,
                courseCode: quizInfo[0].course_code,
                avgMark,
                totalStudents
            },
            studentPerformance: studentPerformance.map(student => ({
                rollNo: student.roll_no,
                name: student.name,
                marks: parseFloat(student.marks) || 0,
                questionsAttempted: parseInt(student.questions_attempted) || 0
            })),
            questionPerformance: questionPerformance.map(q => ({
                id: q.id,
                question: q.question,
                totalAttempts: parseInt(q.total_attempts) || 0,
                correctAnswers: parseInt(q.correct_answers) || 0
            })),
            topicPerformance: topicPerformance.map(t => ({
                topic: t.topic,
                avgScore: parseFloat(t.avg_score) || 0
            })),
            typePerformance: typePerformance.map(t => ({
                type: t.type,
                avgScore: parseFloat(t.avg_score) || 0
            }))
        };

        console.log("GET /api/quizzes/[quizId]/result - Response summary:", {
            quizInfo: {
                id: response.quizInfo.id,
                title: response.quizInfo.title,
                totalStudents: response.quizInfo.totalStudents
            },
            students: `${response.studentPerformance.length} students`,
            questions: `${response.questionPerformance.length} questions`,
            topics: `${response.topicPerformance.length} topics`,
            types: `${response.typePerformance.length} types`
        });

        return NextResponse.json(response);

    } catch (error) {
        console.error("Error fetching quiz results:", error);
        return NextResponse.json(
            { error: "Failed to fetch quiz results" },
            { status: 500 }
        );
    }
}
