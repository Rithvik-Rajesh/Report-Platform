"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

interface User {
    id: string | number;
    name: string;
    email: string;
    role: string;
}

interface ClientLayoutProps {
    children: React.ReactNode;
    initialUser: User | null;
}

export default function ClientLayout(
    { children, initialUser }: ClientLayoutProps,
) {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);

    // Use either the authenticated user from context or the initial server-provided user
    const displayUser = user || initialUser;

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Top Navigation Bar */}
            <nav className="sticky top-0 left-0 right-0 h-16 bg-white shadow-sm z-30 px-6 flex items-center justify-between">
                <div className="flex items-center">
                    <Link
                        href="/staff/courses"
                        className="text-xl font-bold text-primary hover:opacity-80"
                    >
                        Analyser
                    </Link>

                    {/* Main navigation links */}
                    {/* {displayUser && (
                        <div className="hidden md:flex ml-10 space-x-8">
                            <Link
                                href={displayUser.role === "STAFF"
                                    ? "/staff/dashboard"
                                    : "/student/dashboard"}
                                className="text-gray-600 hover:text-primary font-medium"
                            >
                                Dashboard
                            </Link>
                            {displayUser.role === "STAFF" && (
                                <>
                                    <Link
                                        href="/staff/quizzes"
                                        className="text-gray-600 hover:text-primary font-medium"
                                    >
                                        Quizzes
                                    </Link>
                                    <Link
                                        href="/staff/results"
                                        className="text-gray-600 hover:text-primary font-medium"
                                    >
                                        Results
                                    </Link>
                                </>
                            )}
                            {displayUser.role === "STUDENT" && (
                                <>
                                    <Link
                                        href="/student/my-quizzes"
                                        className="text-gray-600 hover:text-primary font-medium"
                                    >
                                        My Quizzes
                                    </Link>
                                    <Link
                                        href="/student/performance"
                                        className="text-gray-600 hover:text-primary font-medium"
                                    >
                                        Performance
                                    </Link>
                                </>
                            )}
                        </div>
                    )} */}
                </div>

                <div className="flex items-center gap-4">
                    {displayUser && (
                        <>
                            <div className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                                {displayUser.role}
                            </div>
                            {mounted && <LogoutButton />}
                        </>
                    )}
                    {!displayUser && (
                        <Link
                            href="/login"
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </nav>

            {/* Main content */}
            <main className="flex-grow">
                {children}
            </main>
        </div>
    );
}
