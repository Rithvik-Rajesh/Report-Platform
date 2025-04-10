import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
    { params }: {
        params: {
            quizId: string;
        }
    }
) {
    try {
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

        const quizId = params.quizId;

        // Validate parameters
        if (!quizId) {
            return NextResponse.json(
                { error: "Quiz ID is required" },
                { status: 400 }
            );
        }
        // check if the quiz belongs to the student
        const quiz = await db.query(
            `SELECT q.*
            FROM quizzes q
            JOIN course_student cs ON q.course_id = cs.course_id
            WHERE cs.student_id = $1 AND q.id = $2`,
            [studentId, params.quizId]
        );
        if (quiz.length === 0) {
            return NextResponse.json(
                { error: "Quiz not found" },
                { status: 404 }
            );
        }
        // check if the quiz has ended
        const quizEnded = await db.query(
            `SELECT q.*
            FROM quizzes q
            JOIN course_student cs ON q.course_id = cs.course_id
            WHERE cs.student_id = $1 AND q.id = $2 AND q.end_time < NOW()`,
            [studentId, params.quizId]
        );
        if (quizEnded.length === 0) {
            return NextResponse.json(
                { error: "Quiz not ended" },
                { status: 403 }
            );
        }
        
        if (quizEnded.length === 0) {
            return NextResponse.json(
                { error: "No completed quizzes found for this course" },
                { status: 404 }
            );
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
            WHERE qz.id = $1 
            ORDER BY qz.end_time DESC, q.id`,
            [quizId]
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

                // Map with topics and types
                const topics = await db.query(
                    `SELECT 
                        t.topic
                    FROM question_topic qt
                    JOIN course_topics t ON qt.topic_id = t.id
                    WHERE qt.question_id = $1`,
                    [question.id]
                );

                const types = await db.query(
                    `SELECT
                        t.type
                    FROM question_type qt
                    JOIN course_types t ON qt.type_id = t.id
                    WHERE qt.question_id = $1`,
                    [question.id]
                );


                return {
                    quizTitle: question.quiz_title,
                    question: question.question,
                    score: question.score,
                    difficulty: question.difficulty,
                    topics: topics.map(topic => topic.topic),
                    types: types.map(type => type.type),
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

        const questionsByQuiz = quizEnded.map(quiz => ({
            quizId: quiz.quiz_id,
            title: quiz.title,
            description: quiz.description,
            questions: questionsWithDetails.filter(q => q.quizTitle === quiz.title)
        }));

        return NextResponse.json({
            quizzes: questionsByQuiz
        });
    }
    catch (error) {
        console.error("Error fetching quiz details:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}