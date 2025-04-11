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

        const cookieHeader = request.headers.get('cookie') || undefined;
        const session = await getSessionFromCookies(cookieHeader);
        console.log('GET /api/courses/[courseId]/topics/[topicId] - Session:', session);

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
        console.log('GET /api/courses/[courseId]/topics/[topicId] - Topic data:', topic);

        if (topic.length === 0) {
            return NextResponse.json(
                { error: "Topic not found in this course" },
                { status: 404 }
            );
        }

        const questions = await db.query(
            `SELECT 
                q.id,
                q.question,
                q.score,
                q.difficulty,
                qz.title as quiz_title,
                qz.id as quiz_id
            FROM questions q
            JOIN question_topic qt ON q.id = qt.question_id
            JOIN quizzes qz ON q.quiz_id = qz.id
            WHERE qt.topic_id = $1
            GROUP BY q.id, q.question, q.score, q.difficulty, qz.title, qz.id
            ORDER BY qz.id, q.id`,
            [topicId]
        );
        console.log('GET /api/courses/[courseId]/topics/[topicId] - Raw questions:', questions.length);


        const questionsWithOptions = await Promise.all(questions.map(async (question) => {
            // Get options for this question
            const options = await db.query(
                `SELECT 
                    id, 
                    option_text, 
                    is_correct 
                FROM question_option 
                WHERE question_id = $1
                ORDER BY id`,
                [question.id]
            );

            // Get statistics for this question
            const stats = await db.query(
                `SELECT 
                    COUNT(DISTINCT qa.id) as attempt_count,
                    COUNT(DISTINCT CASE WHEN qo.is_correct = true AND qo.id = qa.selected_option THEN qa.id END) as correct_attempts
                FROM quiz_attempts qa
                LEFT JOIN question_option qo ON qa.selected_option = qo.id
                WHERE qa.question_id = $1`,
                [question.id]
            );

            const attemptCount = parseInt(stats[0]?.attempt_count || '0');
            const correctAttempts = parseInt(stats[0]?.correct_attempts || '0');
            const accuracy = attemptCount > 0
                ? Math.round((correctAttempts / attemptCount) * 100)
                : 0;

            return {
                id: question.id,
                question: question.question,
                score: parseInt(question.score),
                difficulty: question.difficulty,
                quizTitle: question.quiz_title,
                quizId: question.quiz_id,
                options: options.map(o => ({
                    id: o.id,
                    text: o.option_text,
                    is_correct: o.is_correct
                })),
                statistics: {
                    attemptCount,
                    correctAttempts,
                    accuracy
                }
            };
        }));
        console.log('GET /api/courses/[courseId]/topics/[topicId] - Processed questions:', questionsWithOptions.length);

        // Get performance data with min, max, and average scores using student_topic_performance
        const quizPerformance = await db.query(
            `SELECT 
                q.id as quiz_id,
                q.title as quiz_title,
                MAX(stp.evaluated_at) as latest_evaluation
            FROM quizzes q
            JOIN student_topic_performance stp ON q.id = stp.quiz_id
            WHERE stp.topic_id = $1 AND stp.course_id = $2
            GROUP BY q.id, q.title
            ORDER BY MAX(stp.evaluated_at) DESC`,
            [topicId, courseid]
        );
        console.log('GET /api/courses/[courseId]/topics/[topicId] - Quiz performance:', quizPerformance.length);

        // Process performance data for each quiz
        const performanceWithScores = await Promise.all(quizPerformance.map(async (quiz) => {
            // Get student performance data for this quiz and topic
            const studentsPerformance = await db.query(
                `SELECT 
                    student_id,
                    correct_answers,
                    total_questions,
                    score,
                    evaluated_at
                FROM student_topic_performance
                WHERE quiz_id = $1 AND topic_id = $2 AND course_id = $3`,
                [quiz.quiz_id, topicId, courseid]
            );

            if (studentsPerformance.length === 0) {
                return {
                    quizId: quiz.quiz_id,
                    quizTitle: quiz.quiz_title,
                    averageScore: 0,
                    minScore: 0,
                    maxScore: 0,
                    averageAccuracy: 0,
                    evaluatedAt: quiz.latest_evaluation
                };
            }

            // Calculate percentages for each student
            const studentScores = studentsPerformance.map(student => {
                const totalQuestions = parseInt(student.total_questions);
                const score = parseInt(student.score) || 0;
                const correctAnswers = parseInt(student.correct_answers) || 0;

                // Calculate score percentage
                const scorePercent = (score / totalQuestions) ;

                // Calculate accuracy (correct answers percentage)
                const accuracyPercent = (correctAnswers / totalQuestions);

                return {
                    scorePercent,
                    accuracyPercent
                };
            });

            // Calculate min, max, and average scores across all students
            const scorePercentages = studentScores.map(s => s.scorePercent);
            const accuracyPercentages = studentScores.map(s => s.accuracyPercent);

            const minScore = Math.round(Math.min(...scorePercentages));
            const maxScore = Math.round(Math.max(...scorePercentages));
            const avgScore = Math.round(scorePercentages.reduce((sum, score) => sum + score, 0) / scorePercentages.length);
            const avgAccuracy = Math.round(accuracyPercentages.reduce((sum, acc) => sum + acc, 0) / accuracyPercentages.length);

            console.log(`Quiz ${quiz.quiz_id} performance: min=${minScore}%, max=${maxScore}%, avg=${avgScore}%, accuracy=${avgAccuracy}%`);

            return {
                quizId: quiz.quiz_id,
                quizTitle: quiz.quiz_title,
                averageScore: avgScore,
                minScore: minScore,
                maxScore: maxScore,
                averageAccuracy: avgAccuracy,
                evaluatedAt: quiz.latest_evaluation
            };
        }));
        console.log('GET /api/courses/[courseId]/topics/[topicId] - Processed performance data:', performanceWithScores.length);

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

        const response = {
            topic: topic[0].topic,
            statistics: {
                totalQuestions: questionsWithOptions.length,
                overallPerformance: {
                    total_questions: parseInt(overallStats[0]?.total_questions || '0'),
                    average_score: Math.round(parseFloat(overallStats[0]?.average_score || '0')),
                    average_accuracy: Math.round(parseFloat(overallStats[0]?.average_accuracy || '0') * 100) // Convert to percentage
                }
            },
            questions: questionsWithOptions,
            performance: performanceWithScores
        };

        console.log('GET /api/courses/[courseId]/topics/[topicId] - Response structure:',
            JSON.stringify({
                topic: response.topic,
                statistics: response.statistics,
                questions: `${response.questions.length} questions`,
                performance: `${response.performance.length} performance entries`
            })
        );

        return NextResponse.json(response);

    } catch (error) {
        console.error("Error fetching topic data:", error);
        return NextResponse.json(
            { error: "Failed to fetch topic data" },
            { status: 500 }
        );
    }
}