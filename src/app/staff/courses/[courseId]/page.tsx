"use client";
import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Award,
    Book,
    Calendar,
    CalendarClock,
    CheckCircle2,
    Edit,
    Eye,
    FileQuestion,
    GraduationCap,
    Layers,
    Plus,
    Timer,
    TrendingUp,
    UserPlus,
    Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Quiz {
    id: number;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    duration: number;
    marks: number;
    highest_score: number;
    lowest_score: number;
    average_score: number;
    highest_score_percent: number;
    lowest_score_percent: number;
    average_score_percent: number;
}

interface Course {
    id: number;
    name: string;
    code: string;
    description: string;
    created_at: string;
}

export default function CourseDetailPage() {
    const chartRef = useRef<HTMLDivElement>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [showQuizDialog, setShowQuizDialog] = useState(false);
    const [showStudentDialog, setShowStudentDialog] = useState(false);
    const [newQuiz, setNewQuiz] = useState({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        duration: "",
    });
    const [newStudent, setNewStudent] = useState({
        roll_no: "",
        password: "",
    });

    const router = useRouter();

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                const courseId = window.location.pathname.split("/").pop();
                console.log("Page - Fetching course data for ID:", courseId);

                const response = await fetch(`/api/courses/${courseId}`, {
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch course data");
                }

                const data = await response.json();
                console.log("Page - Received data from API:", data);

                if (!data.course) {
                    console.error("Page - No course data received");
                    setError("Course data not found");
                    return;
                }

                setCourse(data.course);

                // Handle potential missing or malformed quiz data
                if (Array.isArray(data.quizStats)) {
                    console.log("Page - Setting quiz stats:", data.quizStats);
                    setQuizzes(data.quizStats);
                } else {
                    console.warn("Page - Quiz stats are not in expected format:", data.quizStats);
                    setQuizzes([]);
                }
            } catch (err) {
                console.error("Page - Error fetching course data:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load course data",
                );
            } finally {
                setIsLoading(false);
            }
        };

        fetchCourseData();
    }, []);

    useEffect(() => {
        if (chartRef.current && quizzes.length > 0) {
            console.log("Page - Building chart with quizzes:", quizzes);
            try {
                const chartInstance = echarts.init(chartRef.current);

                // Ensure we have valid data for the chart
                const quizTitles = quizzes.map((quiz) => quiz.title || `Quiz ${quiz.id}`);
                const highestScores = quizzes.map((quiz) => Number(quiz.highest_score_percent) || 0);
                const averageScores = quizzes.map((quiz) => Number(quiz.average_score_percent) || 0);
                const lowestScores = quizzes.map((quiz) => Number(quiz.lowest_score_percent) || 0);

                console.log("Page - Chart data:", {
                    titles: quizTitles,
                    highest: highestScores,
                    average: averageScores,
                    lowest: lowestScores
                });

                const option = {
                    animation: false,
                    tooltip: {
                        trigger: "axis",
                        formatter: function (params: any[]) {
                            // Find the quiz for this data point
                            const quizTitle = params[0].axisValue;
                            return `<strong>${quizTitle}</strong><br/>
                                    <span style="color: #4ade80;">Highest: ${params[0].value}%</span><br/>
                                    <span style="color: #3b82f6;">Average: ${params[1].value}%</span><br/>
                                    <span style="color: #ef4444;">Lowest: ${params[2].value}%</span>`;
                        },
                        axisPointer: {
                            type: "shadow",
                        },
                    },
                    legend: {
                        data: ['Highest Score', 'Average Score', 'Lowest Score'],
                        bottom: 0
                    },
                    grid: {
                        left: "3%",
                        right: "4%",
                        bottom: "10%",
                        top: "6%",
                        containLabel: true,
                    },
                    xAxis: {
                        type: "category",
                        data: quizTitles,
                        axisLabel: {
                            color: "#64748b",
                            rotate: 30,
                            interval: 0
                        },
                        axisLine: {
                            lineStyle: {
                                color: "#e2e8f0",
                            },
                        },
                    },
                    yAxis: {
                        type: "value",
                        name: "Score (%)",
                        min: 0,
                        max: 100,
                        nameTextStyle: {
                            color: "#64748b",
                        },
                        axisLabel: {
                            color: "#64748b",
                            formatter: '{value}%'
                        },
                        axisLine: {
                            lineStyle: {
                                color: "#e2e8f0",
                            },
                        },
                        splitLine: {
                            lineStyle: {
                                color: "#e2e8f0",
                            },
                        },
                    },
                    series: [
                        {
                            name: "Highest Score",
                            type: "line",
                            data: highestScores,
                            smooth: true,
                            symbol: "circle",
                            symbolSize: 8,
                            itemStyle: {
                                color: "#4ade80", // Green color for highest score
                            },
                            lineStyle: {
                                width: 3,
                                color: "#4ade80",
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
                                color: "#3b82f6", // Blue color for average score
                            },
                            lineStyle: {
                                width: 3,
                                color: "#3b82f6",
                            },
                        },
                        {
                            name: "Lowest Score",
                            type: "line",
                            data: lowestScores,
                            smooth: true,
                            symbol: "circle",
                            symbolSize: 8,
                            itemStyle: {
                                color: "#ef4444", // Red color for lowest score
                            },
                            lineStyle: {
                                width: 3,
                                color: "#ef4444",
                            },
                        }
                    ],
                };

                chartInstance.setOption(option);

                const handleResize = () => {
                    chartInstance.resize();
                };

                window.addEventListener("resize", handleResize);

                return () => {
                    window.removeEventListener("resize", handleResize);
                    chartInstance.dispose();
                };
            } catch (err) {
                console.error("Page - Error rendering chart:", err);
            }
        } else {
            console.log("Page - Not rendering chart, quizzes:", quizzes.length);
        }
    }, [quizzes]);

    const handleCreateQuiz = async () => {
        try {
            const response = await fetch(`/api/courses/${course?.id}/quiz`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newQuiz),
            });
            if (response.ok) {
                setShowQuizDialog(false);
                // Refresh quiz data
                const data = await response.json();
                setQuizzes([...quizzes, data.quiz]);
            }
        } catch (error) {
            console.error("Failed to create quiz:", error);
        }
    };

    const handleAddStudent = async () => {
        try {
            // First create the student
            const studentResponse = await fetch("/api/student", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roll_no: newStudent.roll_no,
                    password: newStudent.password,
                    course_id: course?.id,
                }),
            });

            if (!studentResponse.ok) {
                const errorData = await studentResponse.json();
                throw new Error(errorData.error || "Failed to create student");
            }

            setShowStudentDialog(false);
            setNewStudent({ roll_no: "", password: "" });
            toast.success("Student added successfully");
        } catch (error) {
            console.error("Failed to add student:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to add student",
            );
        }
    };

    const handleViewQuiz = (quizId: number) => {
        router.push(`/staff/courses/${course?.id}/quiz/${quizId}`);
    };

    const handleViewTopic = () => {
        router.push(`/staff/courses/${course?.id}/topics`);
    };

    const handleViewType = () => {
        router.push(`/staff/courses/${course?.id}/types`);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary">
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    if (!course) {
        return null;
    }

    return (
        <div className="bg-gradient-to-b from-green-50 to-white min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section with Green Theme */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <GraduationCap className="h-7 w-7 text-green-600" />
                            </div>
                            <h1 className="text-4xl font-bold text-gray-800">
                                {course?.name}
                            </h1>
                        </div>
                        <p className="text-gray-500 mt-2 ml-[60px]">
                            Course Code:{" "}
                            <span className="text-green-600 font-medium">
                                {course?.code}
                            </span>
                        </p>
                    </div>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Dialog
                                    open={showStudentDialog}
                                    onOpenChange={setShowStudentDialog}
                                >
                                    <DialogTrigger asChild>
                                        <Button className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm transition-all duration-200">
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            {" "}
                                            Add Student
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-xl">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl flex items-center gap-2 text-green-700">
                                                <Users className="h-5 w-5" />
                                                {" "}
                                                Add Student to Course
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-1 gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor="roll_no"
                                                    className="flex items-center gap-2"
                                                >
                                                    <Badge className="h-4 w-4 text-green-600" />
                                                    {" "}
                                                    Roll Number
                                                </Label>
                                                <Input
                                                    id="roll_no"
                                                    value={newStudent.roll_no}
                                                    onChange={(e) =>
                                                        setNewStudent({
                                                            ...newStudent,
                                                            roll_no:
                                                                e.target.value,
                                                        })}
                                                    placeholder="Enter roll number"
                                                    className="focus-visible:ring-green-500"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor="password"
                                                    className="flex items-center gap-2"
                                                >
                                                    <Calendar className="h-4 w-4 text-green-600" />
                                                    {" "}
                                                    Date of Birth (Password)
                                                </Label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    value={newStudent.password}
                                                    onChange={(e) =>
                                                        setNewStudent({
                                                            ...newStudent,
                                                            password:
                                                                e.target.value,
                                                        })}
                                                    placeholder="Enter date of birth"
                                                    className="focus-visible:ring-green-500"
                                                />
                                            </div>
                                            <Button
                                                onClick={handleAddStudent}
                                                className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm transition-all duration-200 mt-2"
                                            >
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                {" "}
                                                Add Student
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Add a student to this course</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <Separator className="mb-8 bg-green-100 h-[2px]" />

                {/* Performance Graph Section */}
                <Card className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 mb-8 border border-green-100 overflow-hidden">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Student Performance
                    </h2>
                    <div ref={chartRef} className="w-full h-80"></div>
                </Card>

                {/* Category Navigation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => handleViewTopic()}
                                    className="py-6 text-lg font-medium bg-green-600 text-white hover:bg-green-700 rounded-xl shadow-md transition-all duration-200"
                                >
                                    <Book className="mr-2 h-5 w-5" /> Topics
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>View and manage course topics</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => handleViewType()}
                                    className="py-6 text-lg font-medium bg-green-600 text-white hover:bg-green-700 rounded-xl shadow-md transition-all duration-200">
                                    <Layers className="mr-2 h-5 w-5" /> Types
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>View question types and categories</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Quiz Section */}
                <div className="mt-10">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                            <FileQuestion className="h-7 w-7 text-green-600 mr-2" />
                            <h2 className="text-2xl font-bold text-gray-800">
                                QUIZZES
                            </h2>
                            <div className="ml-4 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                {quizzes.length} Total
                            </div>
                        </div>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Dialog
                                        open={showQuizDialog}
                                        onOpenChange={setShowQuizDialog}
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="default"
                                                className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm transition-all duration-200"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                {" "}
                                                Add Quiz
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="rounded-xl">
                                            <DialogHeader>
                                                <DialogTitle className="text-2xl flex items-center gap-2 text-green-700">
                                                    <FileQuestion className="h-5 w-5" />
                                                    {" "}
                                                    Create New Quiz
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="grid grid-cols-1 gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor="title"
                                                        className="flex items-center gap-2"
                                                    >
                                                        <FileQuestion className="h-4 w-4 text-green-600" />
                                                        {" "}
                                                        Title
                                                    </Label>
                                                    <Input
                                                        id="title"
                                                        value={newQuiz.title}
                                                        onChange={(e) =>
                                                            setNewQuiz({
                                                                ...newQuiz,
                                                                title:
                                                                    e.target
                                                                        .value,
                                                            })}
                                                        placeholder="Quiz title"
                                                        className="focus-visible:ring-green-500"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor="description"
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Book className="h-4 w-4 text-green-600" />
                                                        {" "}
                                                        Description
                                                    </Label>
                                                    <Input
                                                        id="description"
                                                        value={newQuiz
                                                            .description}
                                                        onChange={(e) =>
                                                            setNewQuiz({
                                                                ...newQuiz,
                                                                description:
                                                                    e.target
                                                                        .value,
                                                            })}
                                                        placeholder="Quiz description"
                                                        className="focus-visible:ring-green-500"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor="start_time"
                                                        className="flex items-center gap-2"
                                                    >
                                                        <CalendarClock className="h-4 w-4 text-green-600" />
                                                        {" "}
                                                        Start Time
                                                    </Label>
                                                    <Input
                                                        id="start_time"
                                                        type="datetime-local"
                                                        value={newQuiz
                                                            .start_time}
                                                        onChange={(e) =>
                                                            setNewQuiz({
                                                                ...newQuiz,
                                                                start_time:
                                                                    e.target
                                                                        .value,
                                                            })}
                                                        className="focus-visible:ring-green-500"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor="end_time"
                                                        className="flex items-center gap-2"
                                                    >
                                                        <CalendarClock className="h-4 w-4 text-green-600" />
                                                        {" "}
                                                        End Time
                                                    </Label>
                                                    <Input
                                                        id="end_time"
                                                        type="datetime-local"
                                                        value={newQuiz.end_time}
                                                        onChange={(e) =>
                                                            setNewQuiz({
                                                                ...newQuiz,
                                                                end_time:
                                                                    e.target
                                                                        .value,
                                                            })}
                                                        className="focus-visible:ring-green-500"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor="duration"
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Timer className="h-4 w-4 text-green-600" />
                                                        {" "}
                                                        Duration (minutes)
                                                    </Label>
                                                    <Input
                                                        id="duration"
                                                        type="number"
                                                        value={newQuiz.duration}
                                                        onChange={(e) =>
                                                            setNewQuiz({
                                                                ...newQuiz,
                                                                duration:
                                                                    e.target
                                                                        .value,
                                                            })}
                                                        placeholder="Duration in minutes"
                                                        className="focus-visible:ring-green-500"
                                                    />
                                                </div>
                                                <Button
                                                    variant="default"
                                                    onClick={handleCreateQuiz}
                                                    className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm transition-all duration-200 mt-2"
                                                >
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    {" "}
                                                    Create Quiz
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Create a new quiz for this course</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {quizzes.map((quiz) => (
                            <Card
                                key={quiz.id}
                                className="overflow-hidden bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-green-100"
                            >
                                <div className="border-t-4 border-green-500">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-bold text-gray-800">
                                                    {quiz.title}
                                                </h3>
                                                <p className="text-gray-600 text-sm line-clamp-2">
                                                    {quiz.description}
                                                </p>
                                            </div>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 px-3 py-1 text-sm rounded-full">
                                                            Completed
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Quiz status</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                                            <div className="space-y-3">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <CalendarClock className="w-4 h-4 mr-2 text-green-600" />
                                                    <span className="font-medium mr-1">
                                                        Start:
                                                    </span>
                                                    <span className="text-gray-800">
                                                        {new Date(
                                                            quiz.start_time,
                                                        ).toLocaleDateString()}
                                                        {" "}
                                                        at{" "}
                                                        {new Date(
                                                            quiz.start_time,
                                                        ).toLocaleTimeString(
                                                            [],
                                                            {
                                                                hour: "2-digit",
                                                                minute:
                                                                    "2-digit",
                                                            },
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <CalendarClock className="w-4 h-4 mr-2 text-green-600" />
                                                    <span className="font-medium mr-1">
                                                        End:
                                                    </span>
                                                    <span className="text-gray-800">
                                                        {new Date(quiz.end_time)
                                                            .toLocaleDateString()}
                                                        {" "}
                                                        at{" "}
                                                        {new Date(quiz.end_time)
                                                            .toLocaleTimeString(
                                                                [],
                                                                {
                                                                    hour:
                                                                        "2-digit",
                                                                    minute:
                                                                        "2-digit",
                                                                },
                                                            )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Timer className="w-4 h-4 mr-2 text-green-600" />
                                                    <span className="font-medium mr-1">
                                                        Duration:
                                                    </span>
                                                    <span className="text-gray-800">
                                                        {quiz.duration} minutes
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Award className="w-4 h-4 mr-2 text-green-600" />
                                                    <span className="font-medium mr-1">
                                                        Total Marks:
                                                    </span>
                                                    <span className="text-gray-800">
                                                        {quiz.marks}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-6">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleViewQuiz(
                                                                    quiz.id,
                                                                )}
                                                            className="border-green-600 text-green-600 hover:bg-green-50 rounded-full"
                                                        >
                                                            <Eye className="mr-1 h-4 w-4" />
                                                            {" "}
                                                            View Details
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>
                                                            View quiz details
                                                            and questions
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 text-white hover:bg-green-700 rounded-full"
                                                        >
                                                            <Edit className="mr-1 h-4 w-4" />
                                                            {" "}
                                                            Edit Quiz
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>
                                                            Edit quiz settings
                                                            and content
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
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
