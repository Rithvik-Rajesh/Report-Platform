"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Book,
  Calendar,
  ChevronDown,
  Code,
  Eye,
  FileEdit,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  PenSquare,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Course {
  id: number;
  name: string;
  code: string;
  description: string;
  created_at: string;
  student_count: number;
}

export default function StaffCoursesPage() {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/courses", {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch courses");
      }

      const data = await response.json();
      setCourses(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load courses. Please try again later.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      setError("Course name and code are required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create course");
      }

      setIsAddDialogOpen(false);
      const newCourseData = await response.json();
      setCourses([...courses, { ...newCourseData, student_count: 0 }]);
      setFormData({ name: "", code: "", description: "" });
      router.refresh();
    } catch (err) {
      setError("Failed to create course. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedCourse || !formData.name || !formData.code) {
      setError("Course name and code are required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/courses?courseId=${selectedCourse.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update course");
      }

      setIsEditDialogOpen(false);
      const updatedCourseData = await response.json();
      setCourses(
        courses.map((course) =>
          course.id === selectedCourse.id ? updatedCourseData : course
        ),
      );
      setFormData({ name: "", code: "", description: "" });
      setSelectedCourse(null);
      router.refresh();
    } catch (err) {
      setError("Failed to update course. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/courses?id=${selectedCourse.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete course");
      }

      setIsDeleteDialogOpen(false);
      setCourses(courses.filter((course) => course.id !== selectedCourse.id));
      setSelectedCourse(null);
      router.refresh();
    } catch (err) {
      setError("Failed to delete course. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      description: course.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (course: Course) => {
    setSelectedCourse(course);
    setIsDeleteDialogOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getRandomGradient = (id: number) => {
    const gradients = [
      "bg-gradient-to-br from-green-50 to-emerald-100 border-green-200",
      "bg-gradient-to-br from-teal-50 to-green-100 border-teal-200",
      "bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-200",
      "bg-gradient-to-br from-green-100 to-emerald-200 border-green-300",
      "bg-gradient-to-br from-teal-100 to-green-200 border-teal-300",
    ];
    return gradients[id % gradients.length];
  };

  const getRandomAccent = (id: number) => {
    const colors = [
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-green-600",
      "bg-emerald-600",
    ];
    return colors[id % colors.length];
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Enhanced header with modern styling */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-green-800 flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-xl">
                <Book className="h-8 w-8 text-green-700" />
              </div>
              <span>My Courses</span>
            </h1>
            <p className="text-green-700 text-sm mt-2">
              Manage your courses and track student progress
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 w-full sm:w-64 rounded-full border-green-200 focus:border-green-600 focus:ring-green-600 shadow-sm"
              />
            </div>
            <Button
              className="rounded-full bg-green-600 hover:bg-green-700 text-white shadow-md"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-5 w-5" /> Add Course
            </Button>
          </div>
        </div>
      </div>

      {isLoading
        ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
          </div>
        )
        : error
          ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
              <AlertCircle className="h-6 w-6 mr-2" />
              {error}
            </div>
          )
          : courses.length === 0
            ? (
              <div className="bg-green-50 border border-green-100 p-8 rounded-lg text-center shadow-md">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
                  <Book className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold text-green-700 mb-2">
                  No courses yet
                </h3>
                <p className="text-gray-500 mb-4 max-w-md mx-auto">
                  Get started by creating your first course. Your students will be
                  able to join once it's created.
                </p>
                <Button
                  className="rounded-full bg-green-600 hover:bg-green-700 text-white shadow-md"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="mr-2 h-5 w-5" /> Create Your First Course
                </Button>
              </div>
            )
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <Card
                    key={course.id}
                    className="overflow-hidden transition-all duration-200 hover:shadow-xl rounded-xl group border-none shadow-md"
                  >
                    {/* Modern card design with gradient background */}
                    <div
                      className={`${getRandomGradient(course.id)
                        } relative p-6 pb-4`}
                    >
                      <div className="absolute right-4 top-4 opacity-80 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
                            >
                              <MoreHorizontal className="h-5 w-5 text-green-800" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <Link href={`/staff/courses/${course.id}`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Eye className="h-5 w-5 mr-2" /> View Details
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleEditClick(course)}
                            >
                              <FileEdit className="h-5 w-5 mr-2" /> Edit Course
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteClick(course)}
                            >
                              <Trash2 className="h-5 w-5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Course info with better layout */}
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-start">
                          <div
                            className={`h-12 w-12 flex items-center justify-center rounded-xl ${getRandomAccent(course.id)
                              } text-white mr-3`}
                          >
                            <Book className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold text-green-800 mb-1 group-hover:text-green-700 transition-colors">
                              {course.name}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className="border-green-200 text-green-700 font-medium bg-white/50 backdrop-blur-sm"
                            >
                              <Code className="h-3.5 w-3.5 mr-1" />
                              {course.code}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="px-6 py-4">
                      <CardDescription className="text-sm text-gray-600 min-h-[60px] line-clamp-3">
                        {course.description || "No description available"}
                      </CardDescription>

                      {/* Stats row with modern styling */}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="bg-green-100 p-1.5 rounded-full">
                            <Users className="h-4 w-4 text-green-700" />
                          </div>
                          <span className="font-medium text-green-800">
                            {course.student_count} students
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {new Date(course.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="bg-white px-6 py-4">
                      <Link
                        href={`/staff/courses/${course.id}`}
                        className="w-full"
                      >
                        <Button
                          variant="outline"
                          className="rounded-lg border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300 text-green-600 w-full group-hover:bg-green-600 group-hover:text-white group-hover:border-green-600 transition-all"
                        >
                          <Eye className="h-5 w-5 mr-2" /> View Course
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

      {/* Add Course Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-green-600" />
              Add New Course
            </DialogTitle>
            <DialogDescription>
              Create a new course for your students. Fill in the details below.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Course Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Introduction to Programming"
                value={formData.name}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Course Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                placeholder="e.g. CS101"
                value={formData.code}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter course description..."
                value={formData.description}
                onChange={handleChange}
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setFormData({ name: "", code: "", description: "" });
                setError("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Creating...
                  </>
                )
                : (
                  <>
                    <PenSquare className="mr-2 h-4 w-4" /> Create Course
                  </>
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-green-600" />
              Edit Course
            </DialogTitle>
            <DialogDescription>
              Update the course information below.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Course Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                name="name"
                placeholder="e.g. Introduction to Programming"
                value={formData.name}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-code" className="text-right">
                Course Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-code"
                name="code"
                placeholder="e.g. CS101"
                value={formData.code}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-description"
                name="description"
                placeholder="Enter course description..."
                value={formData.description}
                onChange={handleChange}
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setFormData({ name: "", code: "", description: "" });
                setError("");
                setSelectedCourse(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleEditSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Updating...
                  </>
                )
                : (
                  <>
                    <FileEdit className="mr-2 h-4 w-4" /> Update Course
                  </>
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the course &quot;{selectedCourse
                ?.name}&quot; and all associated data. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteCourse}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Deleting...
                  </>
                )
                : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </>
                )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
