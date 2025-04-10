import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { generateCacheKey, getCachedData } from "@/lib/cache";

export async function GET(
    request: Request,
    { params }: {
        params: {
            quizId: string;
        };
    },
) {
    try {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }
        const session = await getSessionFromCookies(cookieHeader);
        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }
        // Check if the user is a student
        if (session.user.role !== "STUDENT") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            );
        }

        const studentId = session.user.id;
        const quizId = params.quizId;

        // Validate parameters
        if (!quizId) {
            return NextResponse.json(
                { error: "Quiz ID is required" },
                { status: 400 },
            );
        }

        // Generate cache key
        const cacheKey = generateCacheKey([
            "quiz",
            quizId,
            `student:${studentId}`,
        ]);

        const quizData = await getCachedData(cacheKey, async () => {
            // check if the quiz belongs to the student
            const quiz = await db.query(
                `SELECT q*
                FROM quizzes q
                JOIN course_student cs ON q.course_id = cs.course_id
                WHERE cs.student_id = $1 AND q.id = $2`,
                [studentId, params.quizId],
            );

            if (quiz.length === 0) {
                return null;
            }

            // check if the quiz has started
            const quizStarted = await db.query(
                `SELECT q.*
                FROM quizzes q
                JOIN course_student cs ON q.course_id = cs.course_id
                WHERE cs.student_id = $1 AND q.id = $2 AND q.start_time <= NOW()`,
                [studentId, params.quizId],
            );
            if (quizStarted.length === 0) {
                return { error: "Quiz has not started yet", status: 403 };
            }

            // Fetch the questions for the quiz
            const questions = await db.query(
                `SELECT 
                    q.id,
                    q.question,
                    q.score,
                    q.difficulty
                FROM questions q
                WHERE q.quiz_id = $1
                ORDER BY q.id`,
                [quizId],
            );

            if (questions.length === 0) {
                return {
                    quizTitle: quiz[0].title,
                    description: quiz[0].description,
                    message: "No questions found for this quiz",
                    questions: [],
                };
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
                        [question.id],
                    );

                    return {
                        id: question.id,
                        question: question.question,
                        score: question.score,
                        difficulty: question.difficulty,
                        options: options.map((opt) => ({
                            id: opt.id,
                            text: opt.option_text,
                            isCorrect: opt.is_correct,
                        })),
                    };
                }),
            );

            return {
                quizId: quiz[0].id,
                quizTitle: quiz[0].title,
                description: quiz[0].description,
                questions: questionsWithDetails,
            };
        }, 1800); // 30 minutes TTL for quiz data

        if (!quizData) {
            return NextResponse.json(
                { error: "Quiz not found" },
                { status: 404 },
            );
        }

        if (quizData.error) {
            return NextResponse.json(
                { error: quizData.error },
                { status: quizData.status || 400 },
            );
        }

        return NextResponse.json(quizData);
    } catch (error) {
        console.error("Error fetching quiz:", error);
        return NextResponse.json({ error: "Failed to fetch quiz" }, {
            status: 500,
        });
    }
}
