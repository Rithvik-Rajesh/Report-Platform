"use client";

import { LogoutButton } from "./LogoutButton";
import { useAuth } from "@/context/AuthContext";

export default function NavbarLogoutButton() {
    const { user } = useAuth();

    if (!user) return null;

    return <LogoutButton />;
}
