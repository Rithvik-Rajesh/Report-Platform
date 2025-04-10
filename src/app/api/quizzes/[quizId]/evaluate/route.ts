import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function POST(
    { params }: { params: { quizId: string } }
) {
    try {
        const { quizId } = params;
        const session = await getSessionFromCookies();

        // Check if user is authenticated and is staff
        if (!session || !session.user || session.user.role !== "STAFF") {
            return NextResponse.json(
                { error: "Unauthorized - Staff access required" },
                { status: 401 }
            );
        }

        // Start a transaction
        await db.query('BEGIN');

        try {
            // Get quiz details
            const quiz = await db.query(
                `SELECT id, course_id FROM quizzes WHERE id = $1`,
                [quizId]
            );

            if (quiz.length === 0) {
                throw new Error("Quiz not found");
            }

            const courseId = quiz[0].course_id;
            const evaluatedAt = new Date();

            // Get all questions for the quiz
            const questions = await db.query(
                `SELECT 
                    q.id,
                    qo.id as correct_option_id
                FROM questions q
                JOIN question_option qo ON q.id = qo.question_id
                WHERE q.quiz_id = $1 AND qo.is_correct = true`,
                [quizId]
            );

            // Get all students who attempted the quiz
            const students = await db.query(
                `SELECT DISTINCT student_id 
                FROM quiz_attempts 
                WHERE quiz_id = $1`,
                [quizId]
            );

            // For each student, evaluate their performance
            for (const student of students) {
                const studentId = student.student_id;

                // Get student's attempts
                const attempts = await db.query(
                    `SELECT 
                        qa.question_id,
                        qa.selected_option,
                        qt.topic_id,
                        qty.type_id
                    FROM quiz_attempts qa
                    JOIN question_topic qt ON qa.question_id = qt.question_id
                    JOIN question_type qty ON qa.question_id = qty.question_id
                    WHERE qa.quiz_id = $1 AND qa.student_id = $2`,
                    [quizId, studentId]
                );

                // Calculate scores by topic and type
                const topicScores = new Map();
                const typeScores = new Map();

                for (const attempt of attempts) {
                    const isCorrect = questions.some(q =>
                        q.id === attempt.question_id &&
                        q.correct_option_id === attempt.selected_option
                    );

                    // Update topic scores
                    if (!topicScores.has(attempt.topic_id)) {
                        topicScores.set(attempt.topic_id, { total: 0, correct: 0 });
                    }
                    const topicScore = topicScores.get(attempt.topic_id);
                    topicScore.total++;
                    if (isCorrect) topicScore.correct++;

                    // Update type scores
                    if (!typeScores.has(attempt.type_id)) {
                        typeScores.set(attempt.type_id, { total: 0, correct: 0 });
                    }
                    const typeScore = typeScores.get(attempt.type_id);
                    typeScore.total++;
                    if (isCorrect) typeScore.correct++;
                }

                // Insert student topic performance
                for (const [topicId, score] of topicScores) {
                    await db.query(
                        `INSERT INTO student_topic_performance 
                        (student_id, course_id, topic_id, quiz_id, total_questions, correct_answers, score, evaluated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            studentId,
                            courseId,
                            topicId,
                            quizId,
                            score.total,
                            score.correct,
                            score.total > 0 ? (score.correct / score.total) * 100 : 0,
                            evaluatedAt
                        ]
                    );
                }

                // Insert student type performance
                for (const [typeId, score] of typeScores) {
                    await db.query(
                        `INSERT INTO student_type_performance 
                        (student_id, course_id, type_id, quiz_id, total_questions, correct_answers, score, evaluated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            studentId,
                            courseId,
                            typeId,
                            quizId,
                            score.total,
                            score.correct,
                            score.total > 0 ? (score.correct / score.total) * 100 : 0,
                            evaluatedAt
                        ]
                    );
                }

                // Calculate total marks scored for the student
                let totalMarksScored = 0;

                // Update quiz_attempts with marks_awarded and calculate total marks
                for (const attempt of attempts) {
                    const isCorrect = questions.some(q =>
                        q.id === attempt.question_id &&
                        q.correct_option_id === attempt.selected_option
                    );

                    // Get the marks for this question
                    const questionMarks = await db.query(
                        `SELECT score FROM questions WHERE id = $1`,
                        [attempt.question_id]
                    );

                    const marksAwarded = isCorrect ? questionMarks[0].marks : 0;
                    totalMarksScored += marksAwarded;

                    await db.query(
                        `UPDATE quiz_attempts 
                        SET marks_awarded = $1
                        WHERE quiz_id = $2 AND student_id = $3 AND question_id = $4`,
                        [marksAwarded, quizId, studentId, attempt.question_id]
                    );
                }

                // Insert or update quiz_results with total marks scored
                await db.query(
                    `INSERT INTO quiz_results 
                    (student_id, quiz_id, score)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (student_id, quiz_id) 
                    DO UPDATE SET score = EXCLUDED.score`,
                    [studentId, quizId, totalMarksScored]
                );
            }

            // Calculate and insert class performance metrics
            // For topics
            const topics = await db.query(
                `SELECT DISTINCT topic_id FROM question_topic WHERE question_id IN 
                (SELECT id FROM questions WHERE quiz_id = $1)`,
                [quizId]
            );

            for (const topic of topics) {
                const topicStats = await db.query(
                    `SELECT 
                        AVG(score) as avg_score,
                        AVG(correct_answers::float / total_questions) as avg_accuracy
                    FROM student_topic_performance
                    WHERE topic_id = $1 AND quiz_id = $2`,
                    [topic.topic_id, quizId]
                );

                await db.query(
                    `INSERT INTO class_topic_performance 
                    (course_id, topic_id, quiz_id, avg_score, avg_accuracy, evaluated_at)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        courseId,
                        topic.topic_id,
                        quizId,
                        topicStats[0].avg_score,
                        topicStats[0].avg_accuracy,
                        evaluatedAt
                    ]
                );
            }

            // For types
            const types = await db.query(
                `SELECT DISTINCT type_id FROM question_type WHERE question_id IN 
                (SELECT id FROM questions WHERE quiz_id = $1)`,
                [quizId]
            );

            for (const type of types) {
                const typeStats = await db.query(
                    `SELECT 
                        AVG(score) as avg_score,
                        AVG(correct_answers::float / total_questions) as avg_accuracy
                    FROM student_type_performance
                    WHERE type_id = $1 AND quiz_id = $2`,
                    [type.type_id, quizId]
                );

                await db.query(
                    `INSERT INTO class_type_performance 
                    (course_id, type_id, quiz_id, avg_score, avg_accuracy, evaluated_at)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        courseId,
                        type.type_id,
                        quizId,
                        typeStats[0].avg_score,
                        typeStats[0].avg_accuracy,
                        evaluatedAt
                    ]
                );
            }

            // Update quiz as evaluated
            await db.query(
                `UPDATE quizzes SET is_evaluated = true WHERE id = $1`,
                [quizId]
            );

            await db.query('COMMIT');

            return NextResponse.json({
                message: "Quiz evaluation completed successfully",
                evaluatedAt
            });
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error("Error evaluating quiz:", error);
        return NextResponse.json(
            { error: "Failed to evaluate quiz" },
            { status: 500 }
        );
    }
} 