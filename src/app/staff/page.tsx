"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StaffPage() {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Redirect if not authenticated or not a staff member
        if (!isLoading && (!isAuthenticated || user?.role !== "STAFF")) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, user, router]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                Loading...
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== "STAFF") {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="container mx-auto p-4 mt-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Staff Dashboard</h1>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">
                    Welcome, {user.name}
                </h2>
                <p className="text-gray-600">Email: {user.email}</p>
                <p className="text-gray-600">Role: {user.role}</p>

                {/* Add staff functionality here */}
                <div className="mt-8">
                    <h3 className="text-lg font-medium mb-3">Staff Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Sample action cards */}
                        <div className="bg-blue-50 p-4 rounded-md hover:bg-blue-100 cursor-pointer">
                            Manage Questions
                        </div>
                        <div className="bg-green-50 p-4 rounded-md hover:bg-green-100 cursor-pointer">
                            Create Quiz
                        </div>
                        <div className="bg-purple-50 p-4 rounded-md hover:bg-purple-100 cursor-pointer">
                            View Results
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
