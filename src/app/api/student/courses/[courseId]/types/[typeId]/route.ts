import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET({ params }: { params: { courseId: string,typeId:string } }) {
    try {
        const session = await getSessionFromCookies();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // Check if the user is a student
        if (session.user.role !== "STUDENT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const courseId = params.courseId;
        const typeId = params.typeId;

        if (!typeId) {
            return NextResponse.json({ error: "Type ID is required" }, { status: 400 });
        }

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        const course = await db.query("SELECT * FROM courses WHERE id = $1", [courseId]);

        if (course.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const type = await db.query("SELECT * FROM types WHERE id = $1", [typeId]);

        if (type.length === 0) {
            return NextResponse.json({ error: "type not found" }, { status: 404 });
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
            [courseId, currentTime]
        );

        if (completedQuizzes.length === 0) {
            return NextResponse.json(
                { error: "No completed quizzes found for this course" },
                { status: 404 }
            );
        }


        // Get all questions for the type from completed quizzes
        const questions = await db.query(
            `SELECT 
                q.id,
                q.question,
                q.score,
                q.difficulty,
                q.quiz_id,
                qz.title as quiz_title
            FROM questions q
            JOIN question_type qt ON q.id = qt.question_id
            JOIN quizzes qz ON q.quiz_id = qz.id
            WHERE qt.type_id = $1 
            AND q.quiz_id IN (${completedQuizzes.map(q => q.quiz_id).join(',')})
            ORDER BY qz.end_time DESC, q.id`,
            [typeId]
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
                    [question.id]
                );

                // Get attempts for the question
                const attempts = await db.query(
                    `SELECT 
                        qa.selected_option,
                        qo.option_text as attempted_answer
                    FROM quiz_attempts qa
                    JOIN question_option qo ON qa.selected_option = qo.id
                    WHERE qa.question_id = $1`,
                    [question.id]
                );

                return {
                    quizTitle: question.quiz_title,
                    question: question.question,
                    score: question.score,
                    difficulty: question.difficulty,
                    options: options.map(opt => ({
                        text: opt.option_text,
                        isCorrect: opt.is_correct
                    })),
                    attempts: attempts.map(attempt => ({
                        selectedOption: attempt.attempted_answer
                    }))
                };
            })
        );

        const questionsByQuiz = completedQuizzes.map(quiz => ({
            quizId: quiz.quiz_id,
            title: quiz.title,
            description: quiz.description,
            questions: questionsWithDetails.filter(q => q.quizTitle === quiz.title)
        }));

        return NextResponse.json({
            quizzes: questionsByQuiz
        });


    } catch (error) {
        console.error("Error fetching course:", error);
        return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
    }
}