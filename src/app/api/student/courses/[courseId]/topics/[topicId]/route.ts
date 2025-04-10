import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { generateCacheKey, getCachedData } from "@/lib/cache";

export async function GET(
    { params }: { params: { courseId: string; topicId: string } },
) {
    try {
        const session = await getSessionFromCookies();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }
        // Check if the user is a student
        if (session.user.role !== "STUDENT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const courseId = params.courseId;
        const topicId = params.topicId;
        const studentId = session.user.id;

        if (!topicId) {
            return NextResponse.json({ error: "Topic ID is required" }, {
                status: 400,
            });
        }

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, {
                status: 400,
            });
        }

        // Generate cache key for this specific request
        const cacheKey = generateCacheKey([
            "student",
            `course:${courseId}`,
            `topic:${topicId}`,
            `student:${studentId}`,
        ]);

        return NextResponse.json(
            await getCachedData(cacheKey, async () => {
                const course = await db.query(
                    "SELECT * FROM courses WHERE id = $1",
                    [courseId],
                );

                if (course.length === 0) {
                    return { error: "Course not found", status: 404 };
                }

                // Check if student is enrolled in the course
                const enrollment = await db.query(
                    "SELECT * FROM course_student WHERE course_id = $1 AND student_id = $2",
                    [courseId, studentId],
                );

                if (enrollment.length === 0) {
                    return {
                        error: "You are not enrolled in this course",
                        status: 403,
                    };
                }

                const topic = await db.query(
                    "SELECT * FROM topics WHERE id = $1",
                    [topicId],
                );

                if (topic.length === 0) {
                    return { error: "Topic not found", status: 404 };
                }

                // Get all completed quizzes for the course
                const currentTime = new Date();
                const completedQuizzes = await db.query(
                    `SELECT 
                    q.id as quiz_id,
                    q.title,
                    q.description
                FROM quizzes q
                WHERE q.course_id = $1 
                AND q.end_time < $2
                ORDER BY q.end_time DESC`,
                    [courseId, currentTime],
                );

                if (completedQuizzes.length === 0) {
                    return {
                        message: "No completed quizzes found for this course",
                        quizzes: [],
                    };
                }

                // Get all questions for the topic from completed quizzes
                const questions = await db.query(
                    `SELECT 
                    q.id,
                    q.question,
                    q.score,
                    q.difficulty,
                    q.quiz_id,
                    qz.title as quiz_title
                FROM questions q
                JOIN question_topic qt ON q.id = qt.question_id
                JOIN quizzes qz ON q.quiz_id = qz.id
                WHERE qt.topic_id = $1 
                AND q.quiz_id IN (${
                        completedQuizzes.map((q) => q.quiz_id).join(",")
                    })
                ORDER BY qz.end_time DESC, q.id`,
                    [topicId],
                );

                const questionsWithDetails = await Promise.all(
                    questions.map(async (question) => {
                        // Get options for the question
                        const options = await db.query(
                            `SELECT 
                            option_text,
                            is_correct
                        FROM question_option
                        WHERE question_id = $1`,
                            [question.id],
                        );

                        // Get attempts for the question
                        const attempts = await db.query(
                            `SELECT 
                            qa.selected_option,
                            qo.option_text as attempted_answer
                        FROM quiz_attempts qa
                        JOIN question_option qo ON qa.selected_option = qo.id
                        WHERE qa.question_id = $1 AND qa.student_id = $2`,
                            [question.id, studentId],
                        );

                        return {
                            quizTitle: question.quiz_title,
                            question: question.question,
                            score: question.score,
                            difficulty: question.difficulty,
                            options: options.map((opt) => ({
                                text: opt.option_text,
                                isCorrect: opt.is_correct,
                            })),
                            attempts: attempts.map((attempt) => ({
                                selectedOption: attempt.attempted_answer,
                            })),
                        };
                    }),
                );

                const questionsByQuiz = completedQuizzes.map((quiz) => ({
                    quizId: quiz.quiz_id,
                    title: quiz.title,
                    description: quiz.description,
                    questions: questionsWithDetails.filter((q) =>
                        q.quizTitle === quiz.title
                    ),
                }));

                return {
                    quizzes: questionsByQuiz,
                };
            }, 1800),
        ); // Cache for 30 minutes
    } catch (error) {
        console.error("Error fetching course:", error);
        return NextResponse.json({ error: "Failed to fetch course" }, {
            status: 500,
        });
    }
}
