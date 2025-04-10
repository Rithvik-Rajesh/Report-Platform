"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleDashboardClick = () => {
        // Redirect based on user role
        if (user?.role === "STAFF") {
            router.push("/staff/dashboard");
        } else if (user?.role === "STUDENT") {
            router.push("/student/dashboard");
        } else {
            router.push("/");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                <div className="inline-flex p-4 mx-auto mb-6 bg-red-100 rounded-full">
                    <Shield className="w-12 h-12 text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Access Denied
                </h1>

                <p className="text-gray-600 mb-6">
                    You don't have permission to access this page. This area is
                    restricted to
                    {user?.role === "STAFF" ? " students" : " staff members"}.
                </p>

                <div className="space-y-3">
                    <Button
                        variant="default"
                        className="w-full"
                        onClick={handleDashboardClick}
                    >
                        Go to My Dashboard
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => logout()}
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}
