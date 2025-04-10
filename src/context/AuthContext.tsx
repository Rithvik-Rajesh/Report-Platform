"use client";

import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { useRouter } from "next/navigation";

interface User {
    id: string | number;
    name: string;
    email: string;
    role: string;
    roll_no?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const isAuthenticated = !!user;

    useEffect(() => {
        // Check if user is logged in on initial load
        const checkAuth = async () => {
            try {
                const response = await fetch("/api/auth/me", {
                    credentials: "include",
                });

                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData.user);
                }
            } catch (err) {
                console.error("Auth check failed:", err);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
                credentials: "include",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            setUser(data.user);

            // Navigate based on role
            if (data.user.role === "STAFF") {
                router.push("/staff/courses");
            } else if (data.user.role === "STUDENT") {
                router.push("/student/dashboard");
            } else {
                router.push("/dashboard");
            }

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to login");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Logout failed");
            }

            setUser(null);
            router.push("/login");
        } catch (err) {
            console.error("Logout failed:", err);
            setError(err instanceof Error ? err.message : "Failed to logout");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                login,
                logout,
                error,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
