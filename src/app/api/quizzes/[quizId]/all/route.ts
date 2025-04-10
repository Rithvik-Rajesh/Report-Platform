import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
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

        // Check cache first
        const cacheKey = `quiz_${quizId}_responses`;
        const cookieStore = await cookies();
        const cachedData = cookieStore.get(cacheKey);

        if (cachedData) {
            return NextResponse.json(JSON.parse(cachedData.value));
        }

        // Get all questions for the quiz with their correct answers
        const questions = await db.query(
            `SELECT 
                q.id,
                q.question,
                q.score,
                q.difficulty,
                qo.id as correct_option_id,
                qo.option_text as correct_option_text,
                array_agg(json_build_object(
                    'id', qo2.id,
                    'text', qo2.option_text
                )) as options
            FROM questions q
            JOIN question_option qo ON q.id = qo.question_id AND qo.is_correct = true
            JOIN question_option qo2 ON q.id = qo2.question_id
            WHERE q.quiz_id = $1
            GROUP BY q.id, q.question, q.score, q.difficulty, qo.id, qo.option_text
            ORDER BY q.id`,
            [quizId]
        );

        // Get all students who attempted the quiz
        const students = await db.query(
            `SELECT DISTINCT 
                s.id as student_id,
                u.name as student_name,
                u.roll_no
            FROM quiz_attempts qa
            JOIN students s ON qa.student_id = s.id
            JOIN users u ON s.id = u.id
            WHERE qa.quiz_id = $1`,
            [quizId]
        );

        // Get responses for each student
        const studentResponses = await Promise.all(
            students.map(async (student) => {
                const responses = await db.query(
                    `SELECT 
                        qa.question_id,
                        qa.selected_option,
                        qo.option_text as selected_option_text,
                        qa.marks_awarded
                    FROM quiz_attempts qa
                    JOIN question_option qo ON qa.selected_option = qo.id
                    WHERE qa.quiz_id = $1 AND qa.student_id = $2
                    ORDER BY qa.question_id`,
                    [quizId, student.student_id]
                );

                // Map responses to questions
                const questionResponses = questions.map(q => {
                    const response = responses.find(r => r.question_id === q.id);
                    return {
                        question_id: q.id,
                        question: q.question,
                        score: q.score,
                        difficulty: q.difficulty,
                        correct_option: {
                            id: q.correct_option_id,
                            text: q.correct_option_text
                        },
                        options: q.options,
                        student_response: response ? {
                            selected_option: response.selected_option,
                            selected_text: response.selected_option_text,
                            marks_awarded: response.marks_awarded
                        } : null
                    };
                });

                return {
                    student_id: student.student_id,
                    student_name: student.student_name,
                    roll_no: student.roll_no,
                    responses: questionResponses
                };
            })
        );

        // Cache the results for 5 minutes
        const responseData = {
            quiz_id: quizId,
            students: studentResponses
        };

        const response = NextResponse.json(responseData);
        response.cookies.set(cacheKey, JSON.stringify(responseData), {
            maxAge: 300, // 5 minutes
            path: '/',
            sameSite: 'strict'
        });

        return response;
    } catch (error) {
        console.error("Error fetching quiz responses:", error);
        return NextResponse.json(
            { error: "Failed to fetch quiz responses" },
            { status: 500 }
        );
    }
}
