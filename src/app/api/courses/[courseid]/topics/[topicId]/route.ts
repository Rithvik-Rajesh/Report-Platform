import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
    request: Request,
    { params }: {
        params: {
            courseid: string;
            topicId: string;
        }
    }
) {
    try {
        const cookieHeader = request.headers.get('cookie');

        // Extract and validate parameters
        const { courseid, topicId } = await params;

        if (!courseid || courseid === 'undefined') {
            return NextResponse.json(
                { error: "Course ID is required and cannot be undefined" },
                { status: 400 }
            );
        }

        if (!topicId) {
            return NextResponse.json(
                { error: "Topic ID is required" },
                { status: 400 }
            );
        }

        const session = await getSessionFromCookies(cookieHeader || '');

        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Verify if topic exists in the course
        console.log('GET /api/courses/[courseId]/topics/[topicId] - Topic ID:', topicId);
        console.log('GET /api/courses/[courseId]/topics/[topicId] - Course ID:', courseid);
        const topic = await db.query(
            `SELECT id, topic 
            FROM course_topics 
            WHERE id = $1 AND course_id = $2`,
            [topicId, courseid]
        );

        if (topic.length === 0) {
            return NextResponse.json(
                { error: "Topic not found in this course" },
                { status: 404 }
            );
        }

        // Get all questions for this topic across all quizzes
        const questions = await db.query(
            `SELECT 
                q.id,
                q.question,
                q.score,
                q.difficulty,
                qz.title as quiz_title,
                qz.id as quiz_id,
                json_agg(
                    json_build_object(
                        'id', qo.id,
                        'text', qo.option_text,
                        'is_correct', qo.is_correct
                    ) ORDER BY qo.id
                ) as options,
                COUNT(DISTINCT qa.id) as attempt_count,
                COUNT(DISTINCT CASE WHEN qo2.is_correct = true AND qo2.id = qa.selected_option THEN qa.id END) as correct_attempts
            FROM questions q
            JOIN question_topic qt ON q.id = qt.question_id
            JOIN quizzes qz ON q.quiz_id = qz.id
            LEFT JOIN question_option qo ON q.id = qo.question_id
            LEFT JOIN quiz_attempts qa ON q.id = qa.question_id
            LEFT JOIN question_option qo2 ON qa.selected_option = qo2.id
            WHERE qt.topic_id = $1
            GROUP BY q.id, q.question, q.score, q.difficulty, qz.title, qz.id
            ORDER BY qz.id, q.id`,
            [topicId]
        );


        // Modify your performance query in the GET function to include min and max scores
        const performance = await db.query(
            `SELECT 
                ctp.*,
                q.title AS quiz_title,
                TO_CHAR(ctp.evaluated_at, 'YYYY-MM-DD HH24:MI:SS') AS evaluation_date,
                COALESCE(MIN(qa.marks_awarded), 0) AS min_score,
                COALESCE(MAX(qa.marks_awarded), 0) AS max_score
            FROM class_topic_performance ctp
            JOIN quizzes q ON ctp.quiz_id = q.id
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
            LEFT JOIN question_topic qt ON qa.question_id = qt.question_id AND qt.topic_id = ctp.topic_id
            WHERE ctp.topic_id = $1 AND ctp.course_id = $2
            GROUP BY ctp.id, q.title
            ORDER BY ctp.evaluated_at DESC`,
            [topicId, courseid]
        );
        

        // Then update the mapping to include the new fields
        performance: performance.map(p => ({
            quizId: p.quiz_id,
            quizTitle: p.quiz_title,
            averageScore: parseFloat(p.avg_score),
            minScore: parseFloat(p.min_score),
            maxScore: parseFloat(p.max_score),
            averageAccuracy: parseFloat(p.avg_accuracy),
            evaluatedAt: p.evaluation_date
        }))

        // Calculate overall statistics
        const overallStats = await db.query(
            `SELECT 
                COUNT(DISTINCT q.id) as total_questions,
                AVG(ctp.avg_score) as average_score,
                AVG(ctp.avg_accuracy) as average_accuracy
            FROM questions q
            JOIN question_topic qt ON q.id = qt.question_id
            LEFT JOIN class_topic_performance ctp ON qt.topic_id = ctp.topic_id
            WHERE qt.topic_id = $1`,
            [topicId]
        );

        return NextResponse.json({
            topic: topic[0].topic,
            statistics: {
                totalQuestions: questions.length,
                overallPerformance: overallStats[0],
            },
            questions: questions.map(q => ({
                id: q.id,
                question: q.question,
                score: q.score,
                difficulty: q.difficulty,
                quizTitle: q.quiz_title,
                quizId: q.quiz_id,
                options: q.options || [],
                statistics: {
                    attemptCount: parseInt(q.attempt_count),
                    correctAttempts: parseInt(q.correct_attempts),
                    accuracy: q.attempt_count > 0
                        ? (parseInt(q.correct_attempts) / parseInt(q.attempt_count)) * 100
                        : 0
                }
            })),
            performance: performance.map(p => ({
                quizId: p.quiz_id,
                quizTitle: p.quiz_title,
                averageScore: parseFloat(p.avg_score),
                averageAccuracy: parseFloat(p.avg_accuracy),
                evaluatedAt: p.evaluation_date
            }))
        });

    } catch (error) {
        console.error("Error fetching topic data:", error);
        return NextResponse.json(
            { error: "Failed to fetch topic data" },
            { status: 500 }
        );
    }
}