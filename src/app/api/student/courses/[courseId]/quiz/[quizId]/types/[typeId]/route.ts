import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
    { params }: {
        params: {
            courseid: string;
            typeId: string;
            quizId: string;
        }
    }
) {
    try {
        const { courseid, typeId, quizId } = params;
        const session = await getSessionFromCookies();
        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        // Check if the user is a student
        if (session.user.role !== "STUDENT") {
            return NextResponse.json(
                { error: "Forbidden" }, 
                { status: 403 }
            );
        }

        const studentId = session.user.id;
        // Check if the student is enrolled in the course
        const course = await db.query(
            `SELECT c.id
            FROM courses c
            JOIN course_student cs ON c.id = cs.course_id
            WHERE cs.student_id = $1 AND c.id = $2`,
            [studentId, courseid]
        );
        if (course.length === 0) {
            return NextResponse.json(
                { error: "You are not enrolled in this course" },
                { status: 403 }
            );
        }

        // Validate parameters
        if (!courseid || !typeId || !quizId) {
            return NextResponse.json(
                { error: "Course ID, Quiz ID and Topic ID are required" },
                { status: 400 }
            );
        }

        // First verify if the quiz exists and is completed
        const quiz = await db.query(
            `SELECT 
                id,
                title,
                description,
                end_time 
            FROM quizzes
            WHERE id = $1 AND course_id = $2`,
            [quizId, courseid]
        );

        if (quiz.length === 0) {
            return NextResponse.json(
                { error: "Quiz not found" },
                { status: 404 }
            );
        }

        // Get questions for the specific type from the specified quiz
        const questions = await db.query(
            `SELECT 
                q.id,
                q.question,
                q.score,
                q.difficulty
            FROM questions q
            JOIN question_type qt ON q.id = qt.question_id
            WHERE qt.type_id = $1 
            AND q.quiz_id = $2
            ORDER BY q.id`,
            [typeId, quizId]
        );

        if (questions.length === 0) {
            return NextResponse.json({
                quizTitle: quiz[0].title,
                description: quiz[0].description,
                message: "No questions found for this type in the quiz",
                questions: []
            });
        }

        // Get details for each question
        const questionsWithDetails = await Promise.all(
            questions.map(async (question) => {
                // Get options for the question
                const options = await db.query(
                    `SELECT 
                        id,
                        option_text,
                        is_correct
                    FROM question_option
                    WHERE question_id = $1`,
                    [question.id]
                );

                // Get attempts for the question
                const attempts = await db.query(
                    `SELECT 
                        attempted_answer
                    FROM quiz_attempts
                    WHERE question_id = $1 AND student_id = $2`,
                    [question.id, studentId]
                );

                return {
                    id: question.id,
                    question: question.question,
                    score: question.score,
                    difficulty: question.difficulty,
                    options: options.map(opt => ({
                        id: opt.id,
                        text: opt.option_text,
                        isCorrect: opt.is_correct
                    })),
                    attempts: attempts && attempts.length > 0
                    ? attempts.map(attempt => ({
                        selectedOption: attempt.attempted_answer
                      }))
                    : []
                };
            })
        );

        return NextResponse.json({
            quizId: quiz[0].id,
            quizTitle: quiz[0].title,
            description: quiz[0].description,
            questions: questionsWithDetails
        });

    } catch (error) {
        console.error("Error fetching questions by type:", error);
        return NextResponse.json(
            { error: "Failed to fetch questions" },
            { status: 500 }
        );
    }
}