"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface LogoutButtonProps {
    variant?:
        | "default"
        | "destructive"
        | "outline"
        | "secondary"
        | "ghost"
        | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export function LogoutButton(
    { variant = "ghost", size = "sm", className = "" }: LogoutButtonProps,
) {
    const { logout, isLoading } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleLogout}
            disabled={isLoading}
        >
            {isLoading
                ? (
                    "Logging out..."
                )
                : (
                    <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </>
                )}
        </Button>
    );
}
