import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
    { params }: {
        params: {
            courseid: string;
            typeId: string;
        }
    }
) {
    try {
        const { courseid, typeId } = params;
        const session = await getSessionFromCookies();

        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Verify if type exists in the course
        const type = await db.query(
            `SELECT id, type 
            FROM course_types 
            WHERE id = $1 AND course_id = $2`,
            [typeId, courseid]
        );

        if (type.length === 0) {
            return NextResponse.json(
                { error: "Topic not found in this course" },
                { status: 404 }
            );
        }

        // Get all questions for this type across all quizzes
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
            JOIN question_type qt ON q.id = qt.question_id
            JOIN quizzes qz ON q.quiz_id = qz.id
            LEFT JOIN question_option qo ON q.id = qo.question_id
            LEFT JOIN quiz_attempts qa ON q.id = qa.question_id
            LEFT JOIN question_option qo2 ON qa.selected_option = qo2.id
            WHERE qt.type_id = $1
            GROUP BY q.id, q.question, q.score, q.difficulty, qz.title, qz.id
            ORDER BY qz.id, q.id`,
            [typeId]
        );

        // Get type performance across quizzes
        const performance = await db.query(
            `SELECT 
                ctp.*,
                q.title as quiz_title,
                to_char(ctp.evaluated_at, 'YYYY-MM-DD HH24:MI:SS') as evaluation_date
            FROM class_type_performance ctp
            JOIN quizzes q ON ctp.quiz_id = q.id
            WHERE ctp.type_id = $1 AND ctp.course_id = $2
            ORDER BY ctp.evaluated_at DESC`,
            [typeId, courseid]
        );

        // Calculate overall statistics
        const overallStats = await db.query(
            `SELECT 
                COUNT(DISTINCT q.id) as total_questions,
                AVG(ctp.avg_score) as average_score,
                AVG(ctp.avg_accuracy) as average_accuracy
            FROM questions q
            JOIN question_type qt ON q.id = qt.question_id
            LEFT JOIN class_type_performance ctp ON qt.type_id = ctp.type_id
            WHERE qt.type_id = $1`,
            [typeId]
        );

        return NextResponse.json({
            type: type[0].type,
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
        console.error("Error fetching type data:", error);
        return NextResponse.json(
            { error: "Failed to fetch type data" },
            { status: 500 }
        );
    }
}