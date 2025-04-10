"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertTriangle,
    Award,
    BarChart3,
    BookOpen,
    ChartBarIcon,
    CheckCircle2,
    Edit2,
    FileQuestion,
    ListChecks,
    PlusCircle,
    Timer,
    Trash2,
} from "lucide-react";

interface Option {
    id: string;
    text: string;
    isCorrect: boolean;
    option_text?: string;
    is_correct?: boolean;
}

interface Question {
    id: number;
    text?: string;
    question?: string;
    marks?: number;
    score?: number;
    options: Option[];
    type: string;
    topic: string;
    difficulty: string;
}

export default function QuizPage() {
    const params = useParams();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    // Add state for edit dialog
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<
        {
            id: number;
            question: string;
            score: number;
            difficulty: string;
            options: { id: string; option_text: string; is_correct: boolean }[];
            topic: string;
            type: string;
        } | null
    >(null);
    const [newQuestion, setNewQuestion] = useState({
        question: "",
        score: 1,
        difficulty: "EASY",
        options: [
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
        ],
        topic: "",
        type: "",
    });
    const router = useRouter();
    const TOTAL_MARKS = 10;

    const quizInfo = {
        title: "Data Structures & Algorithms Quiz",
        totalMarks: TOTAL_MARKS,
        startTime: "2025-04-09 10:00 AM",
        endTime: "2025-04-09 12:00 PM",
        duration: "120 minutes",
    };

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const courseId = params.courseId as string;
                const quizId = params.quizId as string;
                console.log(
                    `Fetching questions for course: ${courseId}, quiz: ${quizId}`,
                );

                const response = await fetch(
                    `/api/courses/${courseId}/quiz/${quizId}`,
                );
                if (!response.ok) {
                    console.error(
                        `API responded with status: ${response.status}`,
                    );
                    throw new Error(
                        `Failed to fetch questions: ${response.status}`,
                    );
                }

                const data = await response.json();
                console.log("Received data:", data);

                if (!data.questions || !Array.isArray(data.questions)) {
                    console.error(
                        "Questions data is missing or not an array:",
                        data,
                    );
                    setQuestions([]);
                    return;
                }

                const transformedQuestions = data.questions.map(
                    (q: any, index: number) => {
                        const topic = q.topics && Array.isArray(q.topics) &&
                                q.topics.length > 0 && q.topics[0] !== null
                            ? (q.topics[0].topic || "General")
                            : "General";

                        const type = q.types && Array.isArray(q.types) &&
                                q.types.length > 0 && q.types[0] !== null
                            ? (q.types[0].type || "MCQ")
                            : "MCQ";

                        const options = q.options && Array.isArray(q.options) &&
                                q.options.length > 0
                            ? q.options.map((o: any, optIndex: number) => ({
                                id: o.id
                                    ? o.id.toString()
                                    : String.fromCharCode(97 + optIndex),
                                text: o.option_text ||
                                    `Option ${optIndex + 1}`,
                                isCorrect: Boolean(o.is_correct),
                            }))
                            : [];

                        return {
                            id: q.id || index + 1,
                            text: q.question || "",
                            marks: q.score || 1,
                            options,
                            type,
                            topic,
                            difficulty: q.difficulty || "EASY",
                        };
                    },
                );

                console.log("Transformed questions:", transformedQuestions);
                setQuestions(transformedQuestions);
            } catch (error) {
                console.error("Error fetching questions:", error);
                setError(
                    error instanceof Error
                        ? error.message
                        : "Failed to load questions",
                );
            } finally {
                setIsLoading(false);
            }
        };

        if (params.courseId && params.quizId) {
            fetchQuestions();
        }
    }, [params]);

    const handleEditQuestion = (id: number) => {
        console.log(`Editing question ${id}`);
        const questionToEdit = questions.find((q) => q.id === id);
        if (!questionToEdit) return;

        // Transform the question structure to match the edit form format
        setEditingQuestion({
            id: questionToEdit.id,
            question: questionToEdit.text || questionToEdit.question || "",
            score: questionToEdit.marks || questionToEdit.score || 1,
            difficulty: questionToEdit.difficulty || "EASY",
            options: questionToEdit.options.map((opt) => ({
                id: opt.id,
                option_text: opt.text,
                is_correct: opt.isCorrect,
            })),
            topic: questionToEdit.topic || "",
            type: questionToEdit.type || "",
        });

        setIsEditDialogOpen(true);
    };

    const handleEditDialogClose = () => {
        setIsEditDialogOpen(false);
        setEditingQuestion(null);
    };

    const handleEditOptionChange = (
        index: number,
        field: "option_text" | "is_correct",
        value: string | boolean,
    ) => {
        if (!editingQuestion) return;

        const updatedOptions = [...editingQuestion.options];
        updatedOptions[index] = { ...updatedOptions[index], [field]: value };
        setEditingQuestion({ ...editingQuestion, options: updatedOptions });
    };

    const handleSaveEditedQuestion = async () => {
        if (!editingQuestion) return;

        try {
            // Validate that at least one option is correct
            if (!editingQuestion.options.some((option) => option.is_correct)) {
                alert("At least one option must be marked as correct.");
                return;
            }

            console.log("Saving edited question:", editingQuestion);
            const courseId = params.courseId as string;
            const quizId = params.quizId as string;

            const response = await fetch(
                `/api/courses/${courseId}/quiz/${quizId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        question_id: editingQuestion.id,
                        question: editingQuestion.question,
                        score: editingQuestion.score,
                        difficulty: editingQuestion.difficulty,
                        options: editingQuestion.options,
                        topic: editingQuestion.topic,
                        type: editingQuestion.type,
                    }),
                },
            );

            if (!response.ok) {
                console.error(
                    `Edit question request failed with status: ${response.status}`,
                );
                throw new Error("Failed to update question");
            }

            const result = await response.json();
            console.log("Edit question response:", result);

            // Update the question in the state
            setQuestions(questions.map((q) => {
                if (q.id === editingQuestion.id) {
                    return {
                        ...q,
                        text: editingQuestion.question,
                        marks: editingQuestion.score,
                        options: editingQuestion.options.map((o, index) => ({
                            id: o.id,
                            text: o.option_text,
                            isCorrect: o.is_correct,
                        })),
                        type: editingQuestion.type,
                        topic: editingQuestion.topic,
                        difficulty: editingQuestion.difficulty,
                    };
                }
                return q;
            }));

            handleEditDialogClose();
        } catch (error) {
            console.error("Error updating question:", error);
            alert("Failed to update question. Please try again.");
        }
    };

    const handleDeleteQuestion = async (id: number) => {
        try {
            console.log(`Deleting question ${id}`);
            const courseId = params.courseId as string;
            const quizId = params.quizId as string;
            const response = await fetch(
                `/api/courses/${courseId}/quiz/${quizId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ question_id: id }),
                },
            );

            if (!response.ok) {
                console.error(
                    `Delete request failed with status: ${response.status}`,
                );
                throw new Error("Failed to delete question");
            }

            const result = await response.json();
            console.log("Delete response:", result);

            // Remove the question from state
            setQuestions(questions.filter((q) => q.id !== id));
        } catch (error) {
            console.error("Error deleting question:", error);
            alert("Failed to delete question. Please try again.");
        }
    };

    const handleAddDialogOpen = () => {
        setIsAddDialogOpen(true);
    };

    const handleAddDialogClose = () => {
        setIsAddDialogOpen(false);
        // Reset form
        setNewQuestion({
            question: "",
            score: 1,
            difficulty: "EASY",
            options: [
                { option_text: "", is_correct: false },
                { option_text: "", is_correct: false },
                { option_text: "", is_correct: false },
                { option_text: "", is_correct: false },
            ],
            topic: "",
            type: "",
        });
    };

    const handleOptionChange = (
        index: number,
        field: "option_text" | "is_correct",
        value: string | boolean,
    ) => {
        const updatedOptions = [...newQuestion.options];
        updatedOptions[index] = { ...updatedOptions[index], [field]: value };
        setNewQuestion({ ...newQuestion, options: updatedOptions });
    };

    const handleAddQuestion = async () => {
        try {
            // Validate that at least one option is correct
            if (!newQuestion.options.some((option) => option.is_correct)) {
                alert("At least one option must be marked as correct.");
                return;
            }

            console.log("Submitting new question:", newQuestion);
            const courseId = params.courseId as string;
            const quizId = params.quizId as string;
            const response = await fetch(
                `/api/courses/${courseId}/quiz/${quizId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(newQuestion),
                },
            );

            if (!response.ok) {
                console.error(
                    `Add question request failed with status: ${response.status}`,
                );
                throw new Error("Failed to add question");
            }

            const result = await response.json();
            console.log("Add question response:", result);

            // Add the new question to the state
            const newQuestionFormatted: Question = {
                id: result.questionId,
                text: newQuestion.question,
                marks: newQuestion.score,
                options: newQuestion.options.map((o, index) => ({
                    id: String.fromCharCode(97 + index),
                    text: o.option_text || "",
                    isCorrect: o.is_correct || false,
                })),
                type: "MCQ", // Default type
                topic: "General", // Default topic
                difficulty: newQuestion.difficulty,
            };

            setQuestions([...questions, newQuestionFormatted]);
            handleAddDialogClose();
        } catch (error) {
            console.error("Error adding question:", error);
            alert("Failed to add question. Please try again.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                Loading quiz questions...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <h2 className="text-xl text-red-600 mb-4">Error: {error}</h2>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-b from-green-50 to-white min-h-screen">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section with Green Theme */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center">
                        <FileQuestion className="h-8 w-8 text-green-600 mr-3" />
                        <h1 className="text-3xl font-bold text-gray-800">
                            {quizInfo.title}
                        </h1>
                    </div>
                    <div className="flex space-x-4">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleAddDialogOpen}
                                        className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-sm transition duration-200 ease-in-out"
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        {" "}
                                        Add Question
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Add a new question to this quiz</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="border-green-600 text-green-600 hover:bg-green-50 rounded-full shadow-sm transition duration-200 ease-in-out"
                                        onClick={() => {
                                            router.push(`/staff/courses/${params.courseId}/quiz/${params.quizId}/result`);
                                        }}
                                    >
                                        <BarChart3 className="mr-2 h-4 w-4" />
                                        {" "}
                                        View Results
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>View quiz performance analytics</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {/* Quiz Info Card with Green Theme */}
                <Card className="p-6 mb-8 bg-white shadow-md rounded-xl border-green-100 border overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                <ListChecks className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Questions
                                </p>
                                <p className="text-xl font-semibold">
                                    {questions.length}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                <Award className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Total Marks
                                </p>
                                <p className="text-xl font-semibold">
                                    {quizInfo.totalMarks}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                <Timer className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    Start Time
                                </p>
                                <p className="text-xl font-semibold">
                                    {quizInfo.startTime}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                <Timer className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">
                                    End Time
                                </p>
                                <p className="text-xl font-semibold">
                                    {quizInfo.endTime}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Questions Section with Green Theme */}
                {questions.length === 0
                    ? (
                        <Card className="p-8 bg-white rounded-xl shadow-md text-center border-dashed border-2 border-gray-200">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <FileQuestion className="h-8 w-8 text-green-600" />
                                </div>
                                <p className="text-lg text-gray-500 mb-4">
                                    No questions added to this quiz yet.
                                </p>
                                <Button
                                    onClick={handleAddDialogOpen}
                                    className="bg-green-600 hover:bg-green-700 text-white rounded-full shadow-md transition duration-200 ease-in-out"
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />{" "}
                                    Add Your First Question
                                </Button>
                            </div>
                        </Card>
                    )
                    : (
                        <div className="space-y-6">
                            {questions.map((question, index) => (
                                <Card
                                    key={question.id}
                                    className="overflow-hidden bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="border-l-4 border-green-500 pl-0">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 font-semibold">
                                                        {index + 1}
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-800">
                                                        Question {index + 1}
                                                    </h3>
                                                </div>

                                                <div className="flex space-x-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleEditQuestion(
                                                                            question
                                                                                .id,
                                                                        )}
                                                                    className="border-green-600 text-green-600 hover:bg-green-50 rounded-full"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>
                                                                    Edit this
                                                                    question
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleDeleteQuestion(
                                                                            question
                                                                                .id,
                                                                        )}
                                                                    className="border-red-300 text-red-500 hover:bg-red-50 rounded-full"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>
                                                                    Delete this
                                                                    question
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center mb-3 gap-2">
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 rounded-full px-3">
                                                    <ListChecks className="h-3 w-3 mr-1" />
                                                    {" "}
                                                    {question.type}
                                                </Badge>
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 rounded-full px-3">
                                                    <BookOpen className="h-3 w-3 mr-1" />
                                                    {" "}
                                                    {question.topic}
                                                </Badge>
                                                <Badge
                                                    className={`rounded-full px-3 ${
                                                        question.difficulty ===
                                                                "EASY"
                                                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                                                            : question
                                                                    .difficulty ===
                                                                    "MEDIUM"
                                                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                                            : "bg-red-100 text-red-800 hover:bg-red-200"
                                                    }`}
                                                >
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    {" "}
                                                    {question.difficulty}
                                                </Badge>
                                                <span className="text-sm font-medium text-gray-500 flex items-center">
                                                    <Award className="h-3 w-3 mr-1 text-amber-500" />
                                                    {" "}
                                                    {question.marks || 1} marks
                                                </span>
                                            </div>

                                            <p className="text-lg font-medium text-gray-800 mb-4">
                                                {question.text}
                                            </p>

                                            <RadioGroup
                                                defaultValue=""
                                                className="space-y-2 ml-3"
                                            >
                                                {question.options.map(
                                                    (option) => (
                                                        <div
                                                            key={option.id}
                                                            className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                                                                option.isCorrect
                                                                    ? "bg-green-50 border border-green-200"
                                                                    : "hover:bg-gray-50 border border-gray-100"
                                                            }`}
                                                        >
                                                            <RadioGroupItem
                                                                value={option
                                                                    .id}
                                                                id={`${question.id}-${option.id}`}
                                                                className={option
                                                                        .isCorrect
                                                                    ? "text-green-600 border-green-600"
                                                                    : ""}
                                                            />
                                                            <Label
                                                                htmlFor={`${question.id}-${option.id}`}
                                                                className="flex-1 cursor-pointer"
                                                            >
                                                                {option.text}
                                                                {option
                                                                    .isCorrect &&
                                                                    (
                                                                        <CheckCircle2 className="ml-2 h-4 w-4 inline text-green-600" />
                                                                    )}
                                                            </Label>
                                                        </div>
                                                    ),
                                                )}
                                            </RadioGroup>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
            </div>

            {/* Add Question Dialog with Green Theme */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-2xl rounded-xl">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="text-2xl flex items-center gap-2 text-green-700">
                            <FileQuestion className="h-5 w-5" />{" "}
                            Add New Question
                        </DialogTitle>
                        <DialogDescription>
                            Fill in the details to add a new question to this
                            quiz.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Topic Field */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="topic"
                                    className="flex items-center gap-2"
                                >
                                    <BookOpen className="h-4 w-4 text-green-600" />
                                    {" "}
                                    Topic
                                </Label>
                                <Input
                                    id="topic"
                                    value={newQuestion.topic}
                                    onChange={(e) => setNewQuestion({
                                        ...newQuestion,
                                        topic: e.target.value,
                                    })}
                                    placeholder="Enter the topic for this question..."
                                    className="focus-visible:ring-green-500"
                                />
                            </div>

                            {/* Type Field */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="type"
                                    className="flex items-center gap-2"
                                >
                                    <ListChecks className="h-4 w-4 text-green-600" />
                                    {" "}
                                    Question Type
                                </Label>
                                <Input
                                    id="type"
                                    value={newQuestion.type}
                                    onChange={(e) =>
                                        setNewQuestion({
                                            ...newQuestion,
                                            type: e.target.value,
                                        })}
                                    placeholder="Enter the question type..."
                                    className="focus-visible:ring-green-500"
                                />
                            </div>
                        </div>

                        {/* Question Text */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="question-text"
                                className="flex items-center gap-2"
                            >
                                <FileQuestion className="h-4 w-4 text-green-600" />
                                {" "}
                                Question Text
                            </Label>
                            <Textarea
                                id="question-text"
                                value={newQuestion.question}
                                onChange={(e) =>
                                    setNewQuestion({
                                        ...newQuestion,
                                        question: e.target.value,
                                    })}
                                placeholder="Enter your question text here..."
                                className="min-h-20 focus-visible:ring-green-500"
                            />
                        </div>

                        {/* Question Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="marks"
                                    className="flex items-center gap-2"
                                >
                                    <Award className="h-4 w-4 text-green-600" />
                                    {" "}
                                    Marks
                                </Label>
                                <Input
                                    id="marks"
                                    type="number"
                                    min="1"
                                    value={newQuestion.score}
                                    onChange={(e) =>
                                        setNewQuestion({
                                            ...newQuestion,
                                            score: parseInt(e.target.value) ||
                                                1,
                                        })}
                                    className="focus-visible:ring-green-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="difficulty"
                                    className="flex items-center gap-2"
                                >
                                    <AlertTriangle className="h-4 w-4 text-green-600" />
                                    {" "}
                                    Difficulty
                                </Label>
                                <Select
                                    value={newQuestion.difficulty}
                                    onValueChange={(value) =>
                                        setNewQuestion({
                                            ...newQuestion,
                                            difficulty: value,
                                        })}
                                >
                                    <SelectTrigger
                                        id="difficulty"
                                        className="focus-visible:ring-green-500"
                                    >
                                        <SelectValue placeholder="Select difficulty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EASY">
                                            Easy
                                        </SelectItem>
                                        <SelectItem value="MEDIUM">
                                            Medium
                                        </SelectItem>
                                        <SelectItem value="HARD">
                                            Hard
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-green-600" />
                                    {" "}
                                    Options
                                </Label>
                                <p className="text-sm text-gray-500">
                                    Check the correct option(s)
                                </p>
                            </div>
                            {newQuestion.options.map((option, index) => (
                                <div
                                    key={index}
                                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Checkbox
                                        id={`option-correct-${index}`}
                                        checked={option.is_correct}
                                        onCheckedChange={(checked) =>
                                            handleOptionChange(
                                                index,
                                                "is_correct",
                                                checked as boolean,
                                            )}
                                        className="text-green-600 border-green-400 focus:ring-green-500"
                                    />
                                    <Input
                                        id={`option-text-${index}`}
                                        value={option.option_text}
                                        onChange={(e) =>
                                            handleOptionChange(
                                                index,
                                                "option_text",
                                                e.target.value,
                                            )}
                                        placeholder={`Option ${
                                            String.fromCharCode(97 + index)
                                        }`}
                                        className="flex-1 focus-visible:ring-green-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button
                            variant="outline"
                            onClick={handleAddDialogClose}
                            className="rounded-full border-gray-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddQuestion}
                            className="bg-green-600 hover:bg-green-700 rounded-full"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Question Dialog with Green Theme */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl rounded-xl">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="text-2xl flex items-center gap-2 text-green-700">
                            <Edit2 className="h-5 w-5" /> Edit Question
                        </DialogTitle>
                        <DialogDescription>
                            Update the question details and options.
                        </DialogDescription>
                    </DialogHeader>

                    {editingQuestion && (
                        <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Topic Field */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="edit-topic"
                                        className="flex items-center gap-2"
                                    >
                                        <BookOpen className="h-4 w-4 text-green-600" />
                                        {" "}
                                        Topic
                                    </Label>
                                    <Input
                                        id="edit-topic"
                                        value={editingQuestion.topic}
                                        onChange={(e) =>
                                            setEditingQuestion({
                                                ...editingQuestion,
                                                topic: e.target.value,
                                            })}
                                        placeholder="Enter the topic for this question..."
                                        className="focus-visible:ring-green-500"
                                    />
                                </div>

                                {/* Type Field */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="edit-type"
                                        className="flex items-center gap-2"
                                    >
                                        <ListChecks className="h-4 w-4 text-green-600" />
                                        {" "}
                                        Question Type
                                    </Label>
                                    <Input
                                        id="edit-type"
                                        value={editingQuestion.type}
                                        onChange={(e) =>
                                            setEditingQuestion({
                                                ...editingQuestion,
                                                type: e.target.value,
                                            })}
                                        placeholder="Enter the question type..."
                                        className="focus-visible:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="edit-question-text"
                                    className="flex items-center gap-2"
                                >
                                    <FileQuestion className="h-4 w-4 text-green-600" />
                                    {" "}
                                    Question Text
                                </Label>
                                <Textarea
                                    id="edit-question-text"
                                    value={editingQuestion.question}
                                    onChange={(e) =>
                                        setEditingQuestion({
                                            ...editingQuestion,
                                            question: e.target.value,
                                        })}
                                    placeholder="Enter your question text here..."
                                    className="min-h-20 focus-visible:ring-green-500"
                                />
                            </div>

                            {/* Question Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="edit-marks"
                                        className="flex items-center gap-2"
                                    >
                                        <Award className="h-4 w-4 text-green-600" />
                                        {" "}
                                        Marks
                                    </Label>
                                    <Input
                                        id="edit-marks"
                                        type="number"
                                        min="1"
                                        value={editingQuestion.score}
                                        onChange={(e) =>
                                            setEditingQuestion({
                                                ...editingQuestion,
                                                score:
                                                    parseInt(e.target.value) ||
                                                    1,
                                            })}
                                        className="focus-visible:ring-green-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="edit-difficulty"
                                        className="flex items-center gap-2"
                                    >
                                        <AlertTriangle className="h-4 w-4 text-green-600" />
                                        {" "}
                                        Difficulty
                                    </Label>
                                    <Select
                                        value={editingQuestion.difficulty}
                                        onValueChange={(value) =>
                                            setEditingQuestion({
                                                ...editingQuestion,
                                                difficulty: value,
                                            })}
                                    >
                                        <SelectTrigger
                                            id="edit-difficulty"
                                            className="focus-visible:ring-green-500"
                                        >
                                            <SelectValue placeholder="Select difficulty" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EASY">
                                                Easy
                                            </SelectItem>
                                            <SelectItem value="MEDIUM">
                                                Medium
                                            </SelectItem>
                                            <SelectItem value="HARD">
                                                Hard
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <ListChecks className="h-4 w-4 text-green-600" />
                                        {" "}
                                        Options
                                    </Label>
                                    <p className="text-sm text-gray-500">
                                        Check the correct option(s)
                                    </p>
                                </div>
                                {editingQuestion.options.map((
                                    option,
                                    index,
                                ) => (
                                    <div
                                        key={index}
                                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <Checkbox
                                            id={`edit-option-correct-${index}`}
                                            checked={option.is_correct}
                                            onCheckedChange={(checked) =>
                                                handleEditOptionChange(
                                                    index,
                                                    "is_correct",
                                                    checked as boolean,
                                                )}
                                            className="text-green-600 border-green-400 focus:ring-green-500"
                                        />
                                        <Input
                                            id={`edit-option-text-${index}`}
                                            value={option.option_text}
                                            onChange={(e) =>
                                                handleEditOptionChange(
                                                    index,
                                                    "option_text",
                                                    e.target.value,
                                                )}
                                            placeholder={`Option ${
                                                String.fromCharCode(97 + index)
                                            }`}
                                            className="flex-1 focus-visible:ring-green-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-6">
                        <Button
                            variant="outline"
                            onClick={handleEditDialogClose}
                            className="rounded-full border-gray-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEditedQuestion}
                            className="bg-green-600 hover:bg-green-700 rounded-full"
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />{" "}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
