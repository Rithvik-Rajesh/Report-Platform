"use client";

import { use, useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ArrowLeft,
    BarChart3,
    BookOpen,
    CheckCircle2,
    FileQuestion,
    GaugeCircle,
    ListChecks,
    PercentCircle,
    Signal,
    Star,
    TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Option {
    id: string;
    text: string;
    is_correct: boolean;
}

interface Question {
    id: number;
    question: string;
    score: number;
    difficulty: string;
    quizTitle: string;
    quizId: number;
    options: Option[];
    statistics: {
        attemptCount: number;
        correctAttempts: number;
        accuracy: number;
    };
}

interface Performance {
    quizId: number;
    quizTitle: string;
    averageScore: number;
    minScore: number;
    maxScore: number;
    averageAccuracy: number;
    evaluatedAt: string;
}

interface TopicData {
    topic: string;
    statistics: {
        totalQuestions: number;
        overallPerformance: {
            total_questions: number;
            average_score: number;
            average_accuracy: number;
        };
    };
    questions: Question[];
    performance: Performance[];
}

// Dummy data for when API fails
const dummyTopicData: TopicData = {
    topic: "Algorithm Analysis",
    statistics: {
        totalQuestions: 10,
        overallPerformance: {
            total_questions: 10,
            average_score: 75,
            average_accuracy: 68.5,
        },
    },
    questions: [
        {
            id: 1,
            question: "What is the time complexity of binary search?",
            score: 5,
            difficulty: "Medium",
            quizTitle: "Quiz 1: Sorting",
            quizId: 1,
            options: [
                { id: "a1", text: "O(n)", is_correct: false },
                { id: "a2", text: "O(log n)", is_correct: true },
                { id: "a3", text: "O(n log n)", is_correct: false },
                { id: "a4", text: "O(n²)", is_correct: false },
            ],
            statistics: {
                attemptCount: 120,
                correctAttempts: 95,
                accuracy: 79.2,
            },
        },
        {
            id: 2,
            question:
                "Which sorting algorithm has the best average-case time complexity?",
            score: 5,
            difficulty: "Hard",
            quizTitle: "Quiz 1: Sorting",
            quizId: 1,
            options: [
                { id: "b1", text: "Bubble Sort", is_correct: false },
                { id: "b2", text: "Insertion Sort", is_correct: false },
                { id: "b3", text: "Quick Sort", is_correct: true },
                { id: "b4", text: "Selection Sort", is_correct: false },
            ],
            statistics: {
                attemptCount: 120,
                correctAttempts: 72,
                accuracy: 60,
            },
        },
        {
            id: 3,
            question: "What data structure is used to implement BFS?",
            score: 5,
            difficulty: "Medium",
            quizTitle: "Quiz 4: Graphs",
            quizId: 4,
            options: [
                { id: "c1", text: "Stack", is_correct: false },
                { id: "c2", text: "Queue", is_correct: true },
                { id: "c3", text: "Linked List", is_correct: false },
                { id: "c4", text: "Array", is_correct: false },
            ],
            statistics: {
                attemptCount: 110,
                correctAttempts: 85,
                accuracy: 77.3,
            },
        },
        {
            id: 4,
            question: "What is the space complexity of merge sort?",
            score: 5,
            difficulty: "Easy",
            quizTitle: "Quiz 1: Sorting",
            quizId: 1,
            options: [
                { id: "d1", text: "O(1)", is_correct: false },
                { id: "d2", text: "O(log n)", is_correct: false },
                { id: "d3", text: "O(n)", is_correct: true },
                { id: "d4", text: "O(n²)", is_correct: false },
            ],
            statistics: {
                attemptCount: 120,
                correctAttempts: 98,
                accuracy: 81.7,
            },
        },
    ],
    performance: [
        {
            quizId: 1,
            quizTitle: "Quiz 1: Sorting",
            averageScore: 78,
            minScore: 45,
            maxScore: 95,
            averageAccuracy: 72.5,
            evaluatedAt: "2023-09-15T10:00:00Z",
        },
        {
            quizId: 2,
            quizTitle: "Quiz 2: Searching",
            averageScore: 82,
            minScore: 60,
            maxScore: 98,
            averageAccuracy: 76.8,
            evaluatedAt: "2023-09-22T10:00:00Z",
        },
        {
            quizId: 3,
            quizTitle: "Quiz 3: Trees",
            averageScore: 65,
            minScore: 40,
            maxScore: 88,
            averageAccuracy: 62.3,
            evaluatedAt: "2023-09-29T10:00:00Z",
        },
        {
            quizId: 4,
            quizTitle: "Quiz 4: Graphs",
            averageScore: 70,
            minScore: 55,
            maxScore: 92,
            averageAccuracy: 68.5,
            evaluatedAt: "2023-10-06T10:00:00Z",
        },
        {
            quizId: 5,
            quizTitle: "Quiz 5: Dynamic Programming",
            averageScore: 85,
            minScore: 62,
            maxScore: 100,
            averageAccuracy: 79.2,
            evaluatedAt: "2023-10-13T10:00:00Z",
        },
    ],
};

export default function AlgorithmAnalysisPage({
    params = { courseId: "101", topicId: "1" },
}: {
    params?: { courseId: string; topicId: string };
}) {
    const { courseId, topicId } = params;
    const [topicData, setTopicData] = useState<TopicData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    useEffect(() => {
        const fetchTopicData = async () => {
            try {
                // Try to fetch data from API
                const response = await fetch(
                    `/api/courses/${courseId}/topics/${topicId}`,
                );

                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }

                const data = await response.json();
                setTopicData(data);
            } catch (err) {
                // If any error occurs, use dummy data
                console.log(
                    "Error fetching data, using dummy data instead:",
                    err,
                );
                setTopicData(dummyTopicData);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to fetch topic data",
                );
            } finally {
                setLoading(false);
            }
        };

        fetchTopicData();
    }, [courseId, topicId]);

    useEffect(() => {
        if (chartRef.current) {
            const chart = echarts.init(chartRef.current);

            // Get quiz names and scores from the dummy data (keeping as requested)
            const quizNames = dummyTopicData.performance.map((p) =>
                p.quizTitle
            );
            const averageScores = dummyTopicData.performance.map((p) =>
                p.averageScore
            );
            const minScores = dummyTopicData.performance.map((p) => p.minScore);
            const maxScores = dummyTopicData.performance.map((p) => p.maxScore);

            // If we wanted to use actual fetched data instead, we would use this:
            // const quizNames = topicData?.performance.map((p) => p.quizTitle) || []
            // const averageScores = topicData?.performance.map((p) => p.averageScore) || []
            // const minScores = topicData?.performance.map((p) => p.minScore) || []
            // const maxScores = topicData?.performance.map((p) => p.maxScore) || []

            const option = {
                animation: false,
                tooltip: {
                    trigger: "axis",
                    formatter: (params: any[]) => {
                        let tooltip = params[0].name + "<br/>";
                        params.forEach((param: any) => {
                            tooltip +=
                                `${param.marker} ${param.seriesName}: ${param.value} marks<br/>`;
                        });
                        return tooltip;
                    },
                    axisPointer: {
                        type: "shadow",
                    },
                },
                legend: {
                    data: ["Lowest Score", "Average Score", "Highest Score"],
                    bottom: 0,
                    textStyle: {
                        color: "#64748b",
                    },
                    itemGap: 20,
                },
                grid: {
                    left: "3%",
                    right: "4%",
                    bottom: "15%",
                    top: "5%",
                    containLabel: true,
                },
                xAxis: {
                    type: "category",
                    data: quizNames,
                    axisLabel: {
                        color: "#64748b",
                        interval: 0,
                        rotate: 30,
                        fontSize: 11,
                        margin: 15,
                    },
                    axisLine: {
                        lineStyle: {
                            color: "#e2e8f0",
                            width: 2,
                        },
                    },
                },
                yAxis: {
                    type: "value",
                    name: "Marks",
                    nameTextStyle: {
                        color: "#64748b",
                        padding: [0, 0, 10, 0],
                    },
                    axisLabel: {
                        color: "#64748b",
                        fontSize: 11,
                    },
                    axisLine: {
                        lineStyle: {
                            color: "#e2e8f0",
                            width: 2,
                        },
                    },
                    splitLine: {
                        lineStyle: {
                            color: "#e2e8f0",
                            type: "dashed",
                        },
                    },
                },
                series: [
                    {
                        name: "Lowest Score",
                        type: "line",
                        data: minScores,
                        smooth: true,
                        symbol: "circle",
                        symbolSize: 6,
                        itemStyle: {
                            color: "#ef4444", // red
                        },
                        lineStyle: {
                            width: 2,
                            color: "#ef4444",
                        },
                    },
                    {
                        name: "Average Score",
                        type: "line",
                        data: averageScores,
                        smooth: true,
                        symbol: "circle",
                        symbolSize: 8,
                        itemStyle: {
                            color: "#3b82f6", // blue
                        },
                        lineStyle: {
                            width: 3,
                            color: "#3b82f6",
                        },
                        areaStyle: {
                            color: {
                                type: "linear",
                                x: 0,
                                y: 0,
                                x2: 0,
                                y2: 1,
                                colorStops: [
                                    {
                                        offset: 0,
                                        color: "rgba(59, 130, 246, 0.5)",
                                    },
                                    {
                                        offset: 1,
                                        color: "rgba(59, 130, 246, 0.05)",
                                    },
                                ],
                            },
                        },
                    },
                    {
                        name: "Highest Score",
                        type: "line",
                        data: maxScores,
                        smooth: true,
                        symbol: "circle",
                        symbolSize: 6,
                        itemStyle: {
                            color: "#22c55e", // green
                        },
                        lineStyle: {
                            width: 2,
                            color: "#22c55e",
                        },
                    },
                ],
            };

            chart.setOption(option);

            const handleResize = () => {
                chart.resize();
            };

            window.addEventListener("resize", handleResize);

            return () => {
                window.removeEventListener("resize", handleResize);
                chart.dispose();
            };
        }
    }, [topicData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500">
                    </div>
                    <div className="text-xl text-gray-600">
                        Loading topic data...
                    </div>
                </div>
            </div>
        );
    }

    if (error && !topicData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-red-50 p-6 rounded-lg shadow-md max-w-md">
                    <div className="flex items-center mb-4">
                        <svg
                            className="w-8 h-8 text-red-500 mr-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span className="text-xl font-bold text-red-700">
                            Error
                        </span>
                    </div>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <Button
                        variant="default"
                        className="bg-blue-400 hover:bg-blue-500 text-white"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    if (!topicData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">
                    No topic data available
                </div>
            </div>
        );
    }

    const handleViewTopic = () => {
        router.push(`/staff/courses/${courseId}/topics`);
    };

    // Calculate average accuracy across all questions
    const averageAccuracy = topicData.questions.length > 0
        ? topicData.questions.reduce(
            (sum, q) => sum + q.statistics.accuracy,
            0,
        ) / topicData.questions.length
        : 0;

    // Only changing the return UI part
    return (
        <div className="bg-gradient-to-b from-green-50 to-white min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section with Green Theme */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                            <BookOpen className="h-8 w-8 text-green-600" />
                            {topicData.topic}
                        </h1>
                        <p className="text-green-600 font-medium">
                            Topic {topicId} | Course Code: {courseId}
                        </p>
                    </div>
                    <Link href={`/staff/courses/${courseId}/topics`}>
                        <Button
                            variant="default"
                            className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm transition-all"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Topics
                        </Button>
                    </Link>
                </div>

                <Separator className="mb-8 bg-green-100 h-[2px]" />

                {/* Performance Graph Section */}
                <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 mb-8 border border-green-100 overflow-hidden">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        Student Performance
                    </h2>
                    <div
                        ref={chartRef}
                        className="w-full h-96 rounded-lg overflow-hidden"
                    >
                    </div>
                </Card>

                {/* Questions Section */}
                <div className="mt-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-800">
                                QUESTIONS
                            </h2>
                            <div className="ml-4 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                                <FileQuestion className="h-4 w-4 mr-1" />
                                {topicData.questions.length} Total
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600 mr-2">
                                Average Accuracy:
                            </span>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 px-3 py-1 text-sm font-medium rounded-full">
                                <PercentCircle className="h-3 w-3 mr-1" />
                                {averageAccuracy.toFixed(2)}%
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {topicData.questions.map((question) => (
                            <Card
                                key={question.id}
                                className="overflow-hidden bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                            >
                                <div className="border-l-4 border-green-500 pl-0">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold text-gray-800">
                                                {question.question}
                                            </h3>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge
                                                            className={`px-3 py-1 text-sm font-medium rounded-full ${
                                                                question
                                                                        .difficulty ===
                                                                        "Hard"
                                                                    ? "bg-red-100 text-red-800 hover:bg-red-200"
                                                                    : question
                                                                            .difficulty ===
                                                                            "Medium"
                                                                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                                                    : "bg-green-100 text-green-800 hover:bg-green-200"
                                                            }`}
                                                        >
                                                            <Signal className="h-3 w-3 mr-1" />
                                                            {question
                                                                .difficulty}
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>
                                                            Question difficulty
                                                            level
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>

                                        <div className="mt-2 flex items-center">
                                            <Badge className="bg-green-100 text-green-800 mr-2 rounded-full">
                                                <ListChecks className="h-3 w-3 mr-1" />
                                                {question.quizTitle}
                                            </Badge>
                                            <span className="text-sm text-gray-500 flex items-center">
                                                <Star className="h-3 w-3 mr-1 text-amber-500" />
                                                {" "}
                                                {question.score} marks
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center mt-4">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1 text-sm rounded-full">
                                                            <GaugeCircle className="h-3 w-3 mr-1" />
                                                            {question.statistics
                                                                .attemptCount}
                                                            {" "}
                                                            attempts
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>
                                                            Number of student
                                                            attempts
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <span className="text-sm font-medium text-gray-500 flex items-center">
                                                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                                                {question.statistics
                                                    .correctAttempts}{" "}
                                                correct answers
                                            </span>
                                        </div>

                                        <div className="space-y-1 mt-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-700">
                                                    Accuracy
                                                </span>
                                                <span className="text-sm font-medium text-gray-700 flex items-center">
                                                    <PercentCircle className="h-3 w-3 mr-1 text-green-600" />
                                                    {question.statistics
                                                        .accuracy.toFixed(1)}%
                                                </span>
                                            </div>
                                            <Progress
                                                value={question.statistics
                                                    .accuracy}
                                                className={`h-2 bg-gray-100`}
                                                indicatorClassName={`${
                                                    question.statistics
                                                            .accuracy > 75
                                                        ? "bg-green-500"
                                                        : question.statistics
                                                                .accuracy > 50
                                                        ? "bg-yellow-500"
                                                        : "bg-red-500"
                                                }`}
                                            />
                                        </div>

                                        <div className="mt-6">
                                            <h4 className="text-sm font-medium text-gray-700 flex items-center">
                                                <ListChecks className="h-4 w-4 mr-1 text-green-600" />
                                                {" "}
                                                Options:
                                            </h4>
                                            <div className="space-y-2 mt-2">
                                                {question.options.map((
                                                    option,
                                                    index,
                                                ) => (
                                                    <div
                                                        key={option.id}
                                                        className={`flex items-center p-3 rounded-lg transition-colors ${
                                                            option.is_correct
                                                                ? "bg-green-50 border border-green-200"
                                                                : "bg-gray-50 border border-gray-200"
                                                        }`}
                                                    >
                                                        <div
                                                            className={`w-7 h-7 flex items-center justify-center rounded-full mr-3 ${
                                                                option
                                                                        .is_correct
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-gray-200 text-gray-700"
                                                            }`}
                                                        >
                                                            {String
                                                                .fromCharCode(
                                                                    97 + index,
                                                                )}
                                                        </div>
                                                        <span
                                                            className={option
                                                                    .is_correct
                                                                ? "text-green-700 font-medium"
                                                                : "text-gray-700"}
                                                        >
                                                            {option.text}
                                                        </span>
                                                        {option.is_correct && (
                                                            <CheckCircle2 className="ml-auto text-green-600 w-5 h-5" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
