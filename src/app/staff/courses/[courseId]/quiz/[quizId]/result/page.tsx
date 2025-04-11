"use client";

import React, { useEffect, useState } from "react";
import * as echarts from "echarts";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ArrowLeft,
    ArrowRight,
    Award,
    Book,
    Clock,
    FileBarChart,
    Search,
    Users,
    AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface QuizInfo {
    id: string;
    title: string;
    description: string;
    duration: string;
    startTime: string;
    endTime: string;
    totalMarks: number;
    totalQuestions: number;
    courseId: string;
    courseName: string;
    courseCode: string;
    avgMark: number;
    totalStudents: number;
}

interface Student {
    rollNo: string;
    name: string;
    marks: number;
    questionsAttempted: number;
}

interface QuestionPerformance {
    id: number;
    question: string;
    totalAttempts: number;
    correctAnswers: number;
}

interface TopicPerformance {
    topic: string;
    avgScore: number;
}

interface TypePerformance {
    type: string;
    avgScore: number;
}

interface QuizResults {
    quizInfo: QuizInfo;
    studentPerformance: Student[];
    questionPerformance: QuestionPerformance[];
    topicPerformance: TopicPerformance[];
    typePerformance: TypePerformance[];
}

// Mock data for when API fails
const mockQuizResults: QuizResults = {
    quizInfo: {
        id: "101",
        title: "Advanced Database Systems - Final Quiz",
        description: "Final assessment for the database systems course",
        duration: "90 minutes",
        startTime: "10:00 AM, April 10, 2025",
        endTime: "11:30 AM, April 10, 2025",
        totalMarks: 100,
        totalQuestions: 20,
        courseId: "1001",
        courseName: "Advanced Database Systems",
        courseCode: "CS-501",
        avgMark: 78.5,
        totalStudents: 124,
    },
    studentPerformance: [
        {
            rollNo: "CS2101",
            name: "Emma Wilson",
            marks: 92,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2102",
            name: "James Thompson",
            marks: 85,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2103",
            name: "Sophia Chen",
            marks: 97,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2104",
            name: "Noah Garcia",
            marks: 76,
            questionsAttempted: 19,
        },
        {
            rollNo: "CS2105",
            name: "Olivia Martinez",
            marks: 88,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2106",
            name: "William Johnson",
            marks: 79,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2107",
            name: "Ava Brown",
            marks: 94,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2108",
            name: "Ethan Davis",
            marks: 82,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2109",
            name: "Isabella Rodriguez",
            marks: 90,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2110",
            name: "Michael Lee",
            marks: 73,
            questionsAttempted: 18,
        },
        {
            rollNo: "CS2111",
            name: "Charlotte Smith",
            marks: 86,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2112",
            name: "Alexander White",
            marks: 81,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2113",
            name: "Amelia Jackson",
            marks: 95,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2114",
            name: "Benjamin Taylor",
            marks: 77,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2115",
            name: "Mia Thomas",
            marks: 89,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2116",
            name: "Jacob Harris",
            marks: 84,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2117",
            name: "Harper Clark",
            marks: 91,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2118",
            name: "Daniel Lewis",
            marks: 80,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2119",
            name: "Evelyn Walker",
            marks: 93,
            questionsAttempted: 20,
        },
        {
            rollNo: "CS2120",
            name: "Matthew Hall",
            marks: 75,
            questionsAttempted: 19,
        },
    ],
    questionPerformance: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        question: `Q${i + 1}: Sample question ${i + 1}`,
        totalAttempts: 124,
        correctAnswers: Math.floor(Math.random() * 50 + 50),
    })),
    topicPerformance: [
        { topic: "SQL", avgScore: 82 },
        { topic: "Normalization", avgScore: 75 },
        { topic: "Transactions", avgScore: 68 },
        { topic: "Indexing", avgScore: 88 },
        { topic: "NoSQL", avgScore: 70 },
    ],
    typePerformance: [
        { type: "Multiple Choice", avgScore: 85 },
        { type: "True/False", avgScore: 92 },
        { type: "Short Answer", avgScore: 76 },
        { type: "Code Writing", avgScore: 68 },
        { type: "Case Study", avgScore: 72 },
    ],
};

export default function QuizResultsPage(
    { params }: { params: { courseId: string; quizId: string } },
) {
    const { courseId, quizId } = params;
    const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const router = useRouter();

    useEffect(() => {
        const fetchQuizResults = async () => {
            try {
                const response = await fetch(`/api/quizzes/${quizId}/result`);

                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }

                const data = await response.json();
                setQuizResults(data);
            } catch (err) {
                console.log(
                    "Error fetching data, using mock data instead:",
                    err,
                );
                setQuizResults(mockQuizResults);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to fetch quiz results",
                );
            } finally {
                setLoading(false);
            }
        };

        fetchQuizResults();
    }, [quizId]);

    useEffect(() => {
        if (!loading && quizResults) {
            // Question Performance Chart
            const questionChartDom = document.getElementById(
                "question-performance-chart",
            );
            if (questionChartDom) {
                const questionChart = echarts.init(questionChartDom);

                // Use real data from API
                const questions = quizResults.questionPerformance.slice(0, 10).map(q => `Q${q.id}`);
                const correctAnswers = quizResults.questionPerformance.slice(0, 10).map(q => q.correctAnswers);

                const questionOption = {
                    animation: true,
                    title: {
                        text: "Question Performance",
                        left: "center",
                        textStyle: {
                            fontWeight: "normal",
                            fontSize: 16,
                            color: "#166534", // Green-800
                        },
                    },
                    tooltip: {
                        trigger: "axis",
                        axisPointer: {
                            type: "shadow",
                        },
                    },
                    grid: {
                        left: "3%",
                        right: "4%",
                        bottom: "3%",
                        containLabel: true,
                    },
                    xAxis: {
                        type: "category",
                        data: questions,
                        name: "Questions",
                        nameLocation: "middle",
                        nameGap: 30,
                        axisLine: {
                            lineStyle: {
                                color: "#16a34a", // Green-600
                            },
                        },
                    },
                    yAxis: {
                        type: "value",
                        name: "Correct Answers",
                        nameLocation: "middle",
                        nameGap: 50,
                        axisLine: {
                            lineStyle: {
                                color: "#16a34a", // Green-600
                            },
                        },
                    },
                    series: [
                        {
                            name: "Correct Answers",
                            type: "bar",
                            data: correctAnswers,
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(
                                    0,
                                    0,
                                    0,
                                    1,
                                    [
                                        { offset: 0, color: "#22c55e" }, // Green-500
                                        { offset: 1, color: "#15803d" }, // Green-700
                                    ],
                                ),
                            },
                            emphasis: {
                                itemStyle: {
                                    color: new echarts.graphic.LinearGradient(
                                        0,
                                        0,
                                        0,
                                        1,
                                        [
                                            { offset: 0, color: "#16a34a" }, // Green-600
                                            { offset: 1, color: "#166534" }, // Green-800
                                        ],
                                    ),
                                },
                            },
                            barWidth: "60%",
                            showBackground: true,
                            backgroundStyle: {
                                color: "rgba(220, 252, 231, 0.5)", // Green-50
                            },
                        },
                    ],
                };
                questionChart.setOption(questionOption);
            }

            // Topic Performance Chart
            const topicChartDom = document.getElementById(
                "topic-performance-chart",
            );
            if (topicChartDom) {
                const topicChart = echarts.init(topicChartDom);

                // Use real data from API
                const topics = quizResults.topicPerformance.map(t => t.topic);
                const topicScores = quizResults.topicPerformance.map(t => t.avgScore);

                const topicOption = {
                    animation: true,
                    title: {
                        text: "Performance by Topic",
                        left: "center",
                        textStyle: {
                            fontWeight: "normal",
                            fontSize: 16,
                            color: "#166534", // Green-800
                        },
                    },
                    tooltip: {
                        trigger: "axis",
                        axisPointer: {
                            type: "shadow",
                        },
                    },
                    grid: {
                        left: "3%",
                        right: "4%",
                        bottom: "3%",
                        containLabel: true,
                    },
                    xAxis: {
                        type: "category",
                        data: topics,
                        name: "Topics",
                        nameLocation: "middle",
                        nameGap: 30,
                        axisLabel: {
                            interval: 0,
                            rotate: 30,
                        },
                        axisLine: {
                            lineStyle: {
                                color: "#16a34a", // Green-600
                            },
                        },
                    },
                    yAxis: {
                        type: "value",
                        name: "Average Score",
                        nameLocation: "middle",
                        nameGap: 50,
                        max: 100,
                        axisLine: {
                            lineStyle: {
                                color: "#16a34a", // Green-600
                            },
                        },
                    },
                    series: [
                        {
                            name: "Average Score",
                            type: "bar",
                            data: topicScores,
                            itemStyle: {
                                color: function (params: any) {
                                    const colorList = [
                                        "#16a34a", // Green-600
                                        "#15803d", // Green-700
                                        "#166534", // Green-800
                                        "#14532d", // Green-900
                                        "#22c55e", // Green-500
                                    ];
                                    return colorList[
                                        params.dataIndex % colorList.length
                                    ];
                                },
                            },
                            barWidth: "60%",
                            showBackground: true,
                            backgroundStyle: {
                                color: "rgba(220, 252, 231, 0.5)", // Green-50
                            },
                        },
                    ],
                };
                topicChart.setOption(topicOption);
            }

            // Type Performance Chart
            const typeChartDom = document.getElementById(
                "type-performance-chart",
            );
            if (typeChartDom) {
                const typeChart = echarts.init(typeChartDom);

                // Use real data from API
                const types = quizResults.typePerformance.map(t => t.type);
                const typeScores = quizResults.typePerformance.map(t => t.avgScore);

                const typeOption = {
                    animation: true,
                    title: {
                        text: "Performance by Question Type",
                        left: "center",
                        textStyle: {
                            fontWeight: "normal",
                            fontSize: 16,
                            color: "#166534", // Green-800
                        },
                    },
                    tooltip: {
                        trigger: "item",
                    },
                    legend: {
                        bottom: "0%",
                        left: "center",
                    },
                    series: [
                        {
                            name: "Performance",
                            type: "pie",
                            radius: ["40%", "70%"],
                            avoidLabelOverlap: false,
                            itemStyle: {
                                borderRadius: 10,
                                borderColor: "#fff",
                                borderWidth: 2,
                            },
                            label: {
                                show: true,
                                formatter: "{b}: {c}%",
                            },
                            emphasis: {
                                label: {
                                    show: true,
                                    fontSize: "16",
                                    fontWeight: "bold",
                                },
                            },
                            data: types.map((type, index) => ({
                                value: typeScores[index],
                                name: type,
                            })),
                            color: [
                                "#16a34a", // Green-600
                                "#22c55e", // Green-500
                                "#15803d", // Green-700
                                "#166534", // Green-800
                                "#14532d", // Green-900
                            ],
                        },
                    ],
                };
                typeChart.setOption(typeOption);
            }

            // Handle resize for all charts
            const handleResize = () => {
                const charts = [
                    document.getElementById("question-performance-chart"),
                    document.getElementById("topic-performance-chart"),
                    document.getElementById("type-performance-chart"),
                ];

                charts.forEach((chartDom) => {
                    if (chartDom) {
                        echarts.getInstanceByDom(chartDom)?.resize();
                    }
                });
            };

            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }
    }, [loading, quizResults]);

    // Filter students based on search term
    const filteredStudents = quizResults?.studentPerformance
        ? quizResults.studentPerformance.filter(
            (student) =>
                student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        : [];

    // Paginate students
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentStudents = filteredStudents.slice(
        indexOfFirstItem,
        indexOfLastItem,
    );
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-green-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600">
                </div>
            </div>
        );
    }

    if (!quizResults) {
        return (
            <div className="flex justify-center items-center h-screen bg-green-50">
                <div className="bg-white p-6 rounded-lg shadow-md text-red-500 flex items-center gap-3">
                    <AlertTriangle size={24} />
                    Failed to load quiz results
                </div>
            </div>
        );
    }

    const getGradeColor = (marks: number) => {
        if (marks >= 90) {
            return "bg-green-100 text-green-800 border border-green-300";
        }
        if (marks >= 80) {
            return "bg-emerald-100 text-emerald-800 border border-emerald-300";
        }
        if (marks >= 70) {
            return "bg-yellow-100 text-yellow-800 border border-yellow-300";
        }
        return "bg-red-100 text-red-800 border border-red-300";
    };

    return (
        <div className="bg-gradient-to-br from-green-50 to-white min-h-screen py-8 px-6 mx-auto">
            <div className="max-w-7xl mx-auto">
                {/* Back button */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        className="text-green-700 hover:text-green-800 hover:bg-green-100 transition-all flex items-center gap-2"
                        onClick={() =>
                            router.push(
                                `/staff/courses/${params.courseId}/quiz/${params.quizId}`,
                            )}
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Quiz</span>
                    </Button>
                </div>

                {/* Header Section */}
                <Card className="shadow-lg mb-8 bg-white overflow-hidden border-none">
                    <div className="bg-green-600 h-2"></div>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center">
                                <div className="p-3 rounded-full bg-green-100 mr-4">
                                    <FileBarChart className="h-6 w-6 text-green-700" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {quizResults.quizInfo.title}
                                    </h1>
                                    <p className="text-green-700 mt-1">
                                        {quizResults.quizInfo.courseCode} -{" "}
                                        {quizResults.quizInfo.courseName}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-green-100 text-green-800 py-1 px-4 rounded-full text-sm font-medium shadow-sm">
                                {new Date().toLocaleDateString("en-US", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
                            <div className="bg-green-50 p-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:bg-green-100">
                                <div className="flex items-center mb-2">
                                    <Award className="h-5 w-5 text-green-600 mr-2" />
                                    <p className="text-sm text-green-700 font-medium">
                                        Total Marks
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">
                                    {quizResults.quizInfo.totalMarks}
                                </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:bg-green-100">
                                <div className="flex items-center mb-2">
                                    <Clock className="h-5 w-5 text-green-600 mr-2" />
                                    <p className="text-sm text-green-700 font-medium">
                                        Duration
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">
                                    {quizResults.quizInfo.duration}
                                </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:bg-green-100">
                                <div className="flex items-center mb-2">
                                    <Book className="h-5 w-5 text-green-600 mr-2" />
                                    <p className="text-sm text-green-700 font-medium">
                                        Start Time
                                    </p>
                                </div>
                                <p className="text-lg font-bold text-gray-800">
                                    {quizResults.quizInfo.startTime}
                                </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:bg-green-100">
                                <div className="flex items-center mb-2">
                                    <Book className="h-5 w-5 text-green-600 mr-2" />
                                    <p className="text-sm text-green-700 font-medium">
                                        End Time
                                    </p>
                                </div>
                                <p className="text-lg font-bold text-gray-800">
                                    {quizResults.quizInfo.endTime}
                                </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:bg-green-100">
                                <div className="flex items-center mb-2">
                                    <Award className="h-5 w-5 text-green-600 mr-2" />
                                    <p className="text-sm text-green-700 font-medium">
                                        Average Mark
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">
                                    {quizResults.quizInfo.avgMark}
                                </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl shadow-sm transition-all hover:shadow-md hover:bg-green-100">
                                <div className="flex items-center mb-2">
                                    <Users className="h-5 w-5 text-green-600 mr-2" />
                                    <p className="text-sm text-green-700 font-medium">
                                        Students
                                    </p>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">
                                    {quizResults.quizInfo.totalStudents}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Question Performance Chart */}
                <Card className="shadow-lg mb-8 bg-white border-none">
                    <div className="bg-green-600 h-1"></div>
                    <CardContent className="p-6">
                        <div
                            id="question-performance-chart"
                            style={{ width: "100%", height: "400px" }}
                        >
                        </div>
                    </CardContent>
                </Card>

                {/* Split Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <Card className="shadow-lg bg-white border-none">
                        <div className="bg-green-600 h-1"></div>
                        <CardContent className="p-6">
                            <div
                                id="topic-performance-chart"
                                style={{ height: "300px" }}
                            >
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg bg-white border-none">
                        <div className="bg-green-600 h-1"></div>
                        <CardContent className="p-6">
                            <div
                                id="type-performance-chart"
                                style={{ height: "300px" }}
                            >
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Student Performance Table */}
                <Card className="shadow-lg bg-white border-none">
                    <div className="bg-green-600 h-1"></div>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                <Users size={20} className="text-green-700" />
                                Student Performance
                            </h2>
                            <div className="w-full md:w-64 relative">
                                <Input
                                    type="text"
                                    placeholder="Search by name or roll no..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)}
                                    className="pl-9 border-green-200 focus:ring-green-500 focus:border-green-500 rounded-lg"
                                />
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        <div className="rounded-lg overflow-hidden border border-green-100">
                            <ScrollArea className="h-[400px]">
                                <Table>
                                    <TableHeader className="bg-green-50 sticky top-0">
                                        <TableRow>
                                            <TableHead className="font-semibold text-green-800">
                                                Roll No.
                                            </TableHead>
                                            <TableHead className="font-semibold text-green-800">
                                                Student Name
                                            </TableHead>
                                            <TableHead className="font-semibold text-green-800 text-right">
                                                Marks Scored
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentStudents.map((
                                            student,
                                            index,
                                        ) => (
                                            <TableRow
                                                key={student.rollNo}
                                                className={`${index % 2 === 0
                                                    ? "bg-white"
                                                    : "bg-green-50/30"
                                                    } h-14 hover:bg-green-50 transition-colors`}
                                            >
                                                <TableCell className="font-medium">
                                                    {student.rollNo}
                                                </TableCell>
                                                <TableCell>
                                                    {student.name}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(
                                                            student.marks,
                                                        )
                                                            }`}
                                                    >
                                                        {student.marks}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>

                        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-gray-500">
                                Showing {indexOfFirstItem + 1} to{" "}
                                {Math.min(
                                    indexOfLastItem,
                                    filteredStudents.length,
                                )} of {filteredStudents.length} students
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() =>
                                        setCurrentPage((prev) =>
                                            Math.max(prev - 1, 1)
                                        )}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                    className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                >
                                    <ArrowLeft size={16} className="mr-1" />
                                    {" "}
                                    Prev
                                </Button>
                                {Array.from(
                                    { length: Math.min(totalPages, 5) },
                                    (_, i) => {
                                        const pageNumber = i + 1;
                                        return (
                                            <Button
                                                key={pageNumber}
                                                variant={currentPage ===
                                                    pageNumber
                                                    ? "default"
                                                    : "outline"}
                                                onClick={() =>
                                                    setCurrentPage(pageNumber)}
                                                className={currentPage ===
                                                    pageNumber
                                                    ? "bg-green-600 hover:bg-green-700"
                                                    : "border-green-200 text-green-700 hover:bg-green-50"}
                                            >
                                                {pageNumber}
                                            </Button>
                                        );
                                    },
                                )}
                                {totalPages > 5 && (
                                    <span className="flex items-center px-2">
                                        ...
                                    </span>
                                )}
                                <Button
                                    onClick={() =>
                                        setCurrentPage((prev) =>
                                            Math.min(prev + 1, totalPages)
                                        )}
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                    className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                >
                                    Next{" "}
                                    <ArrowRight size={16} className="ml-1" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
