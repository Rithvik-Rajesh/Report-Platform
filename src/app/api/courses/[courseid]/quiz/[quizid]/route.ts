import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: { courseid: string, quizid: string } }) {
    try {
        const { courseid, quizid } = await params;

        if (!courseid) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        if (!quizid) {
            return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
        }

        const course = await db.query("SELECT * FROM courses WHERE id = $1", [courseid]);

        if (course.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const quiz = await db.query("SELECT * FROM quizzes WHERE id = $1 AND course_id = $2", [quizid, courseid]);

        if (quiz.length === 0) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        const questions = await db.query(`
            SELECT 
                q.id,
                q.question,
                q.score,
                q.difficulty,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', qo.id,
                            'option_text', qo.option_text,
                            'is_correct', qo.is_correct
                        )
                    )
                    FROM question_option qo
                    WHERE qo.question_id = q.id
                ) AS options,
                (
                    SELECT json_agg(
                        json_build_object(
                            'topic', ct.topic
                        )
                    )
                    FROM question_topic qt
                    JOIN course_topics ct ON qt.topic_id = ct.id AND ct.course_id = $2
                    WHERE qt.question_id = q.id
                ) AS topics,
                (
                    SELECT json_agg(
                        json_build_object(
                            'type', cty.type
                        )
                    )
                    FROM question_type qty
                    JOIN course_types cty ON qty.type_id = cty.id AND cty.course_id = $2
                    WHERE qty.question_id = q.id
                ) AS types
            FROM questions q
            WHERE q.quiz_id = $1
            ORDER BY q.id ASC
        `, [quizid, courseid]);

        if (!questions || questions.length === 0) {
            return NextResponse.json({
                quiz: quiz[0],
                questions: []
            });
        }

        const processedQuestions = questions.map(q => ({
            ...q,
            options: q.options || [],
            topics: q.topics || [],
            types: q.types || []
        }));

        return NextResponse.json({
            quiz: quiz[0],
            questions: processedQuestions
        });
    } catch (error) {
        console.error("Error fetching quiz:", error);
        return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: { courseid: string, quizid: string } }) {
    try {
        const { courseid, quizid } = await params;

        if (!courseid) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        if (!quizid) {
            return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const { question, score, difficulty, options, topic, type } = body;

        if (!question || !options || !topic || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await db.query('BEGIN');

        try {
            // Check if topic exists, if not create it
            let topicResult = await db.query(
                'SELECT id FROM course_topics WHERE course_id = $1 AND topic = $2',
                [courseid, topic]
            );
            let topicId;
            if (topicResult.length === 0) {
                topicResult = await db.query(
                    'INSERT INTO course_topics (course_id, topic) VALUES ($1, $2) RETURNING id',
                    [courseid, topic]
                );
            }
            topicId = topicResult[0].id;

            // Check if type exists, if not create it
            let typeResult = await db.query(
                'SELECT id FROM course_types WHERE course_id = $1 AND type = $2',
                [courseid, type]
            );
            let typeId;
            if (typeResult.length === 0) {
                typeResult = await db.query(
                    'INSERT INTO course_types (course_id, type) VALUES ($1, $2) RETURNING id',
                    [courseid, type]
                );
            }
            typeId = typeResult[0].id;

            // Insert the question
            const questionResult = await db.query(
                'INSERT INTO questions (quiz_id, question, score, difficulty) VALUES ($1, $2, $3, $4) RETURNING id',
                [quizid, question, score || 1, difficulty || 'EASY']
            );
            const questionId = questionResult[0].id;

            // Insert options
            for (const option of options) {
                await db.query(
                    'INSERT INTO question_option (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
                    [questionId, option.option_text, option.is_correct]
                );
            }

            // Insert topic and type associations
            await db.query(
                'INSERT INTO question_topic (question_id, topic_id) VALUES ($1, $2)',
                [questionId, topicId]
            );

            await db.query(
                'INSERT INTO question_type (question_id, type_id) VALUES ($1, $2)',
                [questionId, typeId]
            );

            await db.query('COMMIT');

            return NextResponse.json({
                message: "Question added successfully",
                questionId
            });
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error adding question:", error);
            return NextResponse.json({ error: "Failed to add question" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error in quiz route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { courseid: string, quizid: string } }) {
    try {
        const { courseid, quizid } = params;

        if (!courseid) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        if (!quizid) {
            return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const questionId = body.question_id;

        if (!questionId) {
            return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
        }

        await db.query('BEGIN');

        try {
            await db.query('DELETE FROM question_option WHERE question_id = $1', [questionId]);
            await db.query('DELETE FROM question_topic WHERE question_id = $1', [questionId]);
            await db.query('DELETE FROM question_type WHERE question_id = $1', [questionId]);
            await db.query('DELETE FROM questions WHERE id = $1 AND quiz_id = $2', [questionId, quizid]);

            await db.query('COMMIT');

            return NextResponse.json({
                message: "Question deleted successfully"
            });
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error deleting question:", error);
            return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error in quiz route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { courseid: string, quizid: string } }) {
    try {
        const { courseid, quizid } = params;

        if (!courseid) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        if (!quizid) {
            return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const questionId = body.question_id;

        if (!questionId) {
            return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
        }

        await db.query('BEGIN');

        try {
            const { question, score, difficulty, options, topics, types } = body;

            if (question) {
                await db.query(
                    'UPDATE questions SET question = $1, score = $2, difficulty = $3 WHERE id = $4 AND quiz_id = $5',
                    [question, score || 1, difficulty || 'EASY', questionId, quizid]
                );
            }

            if (options) {
                for (const option of options) {
                    await db.query(
                        'UPDATE question_option SET option_text = $1, is_correct = $2 WHERE id = $3 AND question_id = $4',
                        [option.option_text, option.is_correct, option.id, questionId]
                    );
                }
            }

            if (topics) {
                for (const topic of topics) {
                    await db.query(
                        'UPDATE question_topic SET topic_id = $1 WHERE id = $2 AND question_id = $3',
                        [topic.topic_id, topic.id, questionId]
                    );
                }
            }

            if (types) {
                for (const type of types) {
                    await db.query(
                        'UPDATE question_type SET type_id = $1 WHERE id = $2 AND question_id = $3',
                        [type.type_id, type.id, questionId]
                    );
                }
            }

            await db.query('COMMIT');

            return NextResponse.json({
                message: "Question updated successfully"
            });
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error updating question:", error);
            return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error in quiz route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}