"use client";

import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CircleCheck,
  FileQuestion,
  GraduationCap,
  PercentCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Topic {
  id: number;
  title: string;
  totalQuestions: number;
  accuracy: number;
  completionRate: number;
  lastAccessed: string;
}

interface CourseData {
  course: {
    id: string;
    name: string;
    code: string;
    description: string;
  };
  statistics: {
    overallAccuracy: number;
    overallCompletion: number;
    totalTopics: number;
  };
  topics: Topic[];
}

// Dummy data for when API fails
const dummyCourseData: CourseData = {
  course: {
    id: "101",
    name: "Advanced Data Structures & Algorithms",
    code: "CS-401",
    description:
      "This course covers advanced topics in data structures and algorithms.",
  },
  statistics: {
    overallAccuracy: 74.15,
    overallCompletion: 100,
    totalTopics: 5,
  },
  topics: [
    {
      id: 1,
      title: "Introduction to Algorithm Analysis",
      totalQuestions: 5,
      accuracy: 82,
      completionRate: 100,
      lastAccessed: "Mar 28, 2025",
    },
    {
      id: 2,
      title: "Sorting Algorithms",
      totalQuestions: 8,
      accuracy: 75,
      completionRate: 100,
      lastAccessed: "Apr 1, 2025",
    },
    {
      id: 3,
      title: "Algorithm Analysis",
      totalQuestions: 4,
      accuracy: 78.75,
      completionRate: 100,
      lastAccessed: "Apr 5, 2025",
    },
    {
      id: 4,
      title: "Graph Algorithms",
      totalQuestions: 6,
      accuracy: 60,
      completionRate: 85,
      lastAccessed: "Apr 7, 2025",
    },
    {
      id: 5,
      title: "Dynamic Programming",
      totalQuestions: 7,
      accuracy: 65,
      completionRate: 75,
      lastAccessed: "Apr 10, 2025",
    },
  ],
};

export default function TopicsPage(
  { params }: { params: { courseId: string } },
) {
  const courseId = params.courseId;
  const router = useRouter();
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/topics`);

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        setCourseData(data);
      } catch (err) {
        console.log("Error fetching data, using dummy data instead:", err);
        setCourseData(dummyCourseData);
        setError(
          err instanceof Error ? err.message : "Failed to fetch course data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  useEffect(() => {
    if (chartRef.current && courseData) {
      const chart = echarts.init(chartRef.current);

      // Use dummy data for the chart (as requested)
      const topicNames = dummyCourseData.topics.map((topic) =>
        topic.title.split(" ").slice(0, 2).join(" ")
      );
      const accuracies = dummyCourseData.topics.map((topic) => topic.accuracy);

      // If we wanted to use actual fetched data instead, we would use this:
      // const topicNames = courseData.topics.map((topic) => topic.title.split(' ').slice(0, 2).join(' '));
      // const accuracies = courseData.topics.map((topic) => topic.accuracy);

      const option = {
        grid: {
          left: "3%",
          right: "3%",
          bottom: "3%",
          top: "8%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: topicNames,
          axisLine: {
            lineStyle: {
              color: "#e2e8f0",
            },
          },
          axisLabel: {
            color: "#64748b",
            fontSize: 10,
          },
        },
        yAxis: {
          type: "value",
          name: "Accuracy (%)",
          nameTextStyle: {
            color: "#64748b",
            align: "right",
          },
          min: 0,
          max: 100,
          axisLine: {
            lineStyle: {
              color: "#e2e8f0",
            },
          },
          axisLabel: {
            color: "#64748b",
            fontSize: 10,
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
            data: accuracies,
            type: "bar",
            barWidth: "40%",
            itemStyle: {
              color: function (params: any) {
                const value = params.value;
                if (value >= 80) return "#10b981"; // emerald-500
                if (value >= 70) return "#3b82f6"; // blue-500
                return "#f59e0b"; // amber-500
              },
            },
            label: {
              show: true,
              position: "top",
              formatter: "{c}%",
              fontSize: 10,
              fontWeight: "bold",
            },
          },
        ],
      };

      chart.setOption(option);
    }
  }, [courseData]);

  const handleViewTopic = (topicId: number) => {
    router.push(`/staff/courses/${courseId}/topics/${topicId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center ">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary">
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="flex justify-center items-center ">
        <div className="text-red-500">Failed to load course data</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-green-50 to-white min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="border-b border-gray-100 pb-6 mb-8">
            <div className="flex items-center mb-2">
              <GraduationCap className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-800">
                {courseData.course.code} {courseData.course.name}
              </h1>
            </div>
            <p className="text-gray-500 mt-2 ml-11">
              {courseData.course.description}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Course Performance Card */}
            <div className="border border-green-100 rounded-xl shadow-sm overflow-hidden bg-white">
              <div className="border-b border-green-100 bg-green-50 p-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                  Course Performance
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="text-sm text-gray-500 flex items-center">
                    <Activity className="h-4 w-4 mr-1 text-green-600" />
                    Accuracy (%)
                  </div>
                  <div ref={chartRef} className="h-[300px]"></div>
                </div>
              </div>
            </div>

            {/* Course Statistics Card */}
            <div className="border border-green-100 rounded-xl shadow-sm overflow-hidden bg-white">
              <div className="border-b border-green-100 bg-green-50 p-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-600" />
                  Course Statistics
                </h2>
              </div>
              <div className="p-6 space-y-8">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-gray-600">
                      <PercentCircle className="h-4 w-4 mr-1 text-green-600" />
                      Overall Accuracy
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                            {courseData.statistics.overallAccuracy.toFixed(2)}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Average accuracy across all topics</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Progress
                    value={courseData.statistics.overallAccuracy}
                    className="h-2 bg-gray-100"
                    indicatorClassName="bg-green-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-gray-600">
                      <CircleCheck className="h-4 w-4 mr-1 text-green-600" />
                      Course Completion
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                            {courseData.statistics.overallCompletion.toFixed(
                              2,
                            )}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Overall course completion rate</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Progress
                    value={courseData.statistics.overallCompletion}
                    className="h-2 bg-gray-100"
                    indicatorClassName="bg-green-600"
                  />
                </div>

                <div className="space-y-4">
                  <div className="text-gray-600 flex items-center">
                    <BookOpen className="h-4 w-4 mr-1 text-green-600" />
                    Topics Overview
                  </div>
                  <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex flex-col items-center justify-center border-4 border-green-200">
                      <span className="text-3xl font-semibold text-green-700">
                        {courseData.statistics.totalTopics}
                      </span>
                      <span className="text-xs text-green-600">Topics</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 mb-8">
            <div className="flex items-center gap-2 mb-8">
              <BookOpen className="h-6 w-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800">TOPICS</h2>
              <Badge className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm ml-2">
                {courseData.topics.length} Total
              </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {/* Topic Cards */}
              {courseData.topics.map((topic) => (
                <div
                  key={topic.id}
                  className="border border-green-100 rounded-xl shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow duration-300"
                >
                  <div className="border-b border-green-100 bg-green-50 p-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-start">
                      <BookOpen className="h-5 w-5 mr-2 text-green-600 flex-shrink-0 mt-1" />
                      <span className="line-clamp-2">{topic.title}</span>
                    </h3>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-5">
                      <div className="flex items-center">
                        <FileQuestion className="w-4 h-4 mr-1 text-green-600" />
                        <span>{topic.totalQuestions} questions</span>
                      </div>

                      <div className="ml-auto flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-green-600" />
                        <span>{topic.lastAccessed}</span>
                      </div>
                    </div>

                    <div className="space-y-5 mb-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center text-gray-600">
                            <PercentCircle className="h-3 w-3 mr-1 text-green-600" />
                            Accuracy
                          </span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{topic.accuracy.toFixed(2)}%</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Average accuracy for this topic</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Progress
                          value={topic.accuracy}
                          className="h-2 bg-gray-100"
                          indicatorClassName={`${
                            topic.accuracy >= 80
                              ? "bg-green-500"
                              : topic.accuracy >= 70
                              ? "bg-blue-600"
                              : "bg-amber-500"
                          }`}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center text-gray-600">
                            <CircleCheck className="h-3 w-3 mr-1 text-green-600" />
                            Completion
                          </span>
                          <span>{topic.completionRate.toFixed(2)}%</span>
                        </div>
                        <Progress
                          value={topic.completionRate}
                          className="h-2 bg-gray-100"
                          indicatorClassName="bg-green-600"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewTopic(topic.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      View Topic
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
