import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { headers } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth";
import db from "@/lib/db";
import ClientLayout from "@/components/auth/ClientLayout";

export const metadata: Metadata = {
  title: "Demo-Evalify",
  description: "Quiz and evaluation platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user data on the server
  const headersList = headers();
  const cookies = headersList.get("cookie") || "";
  const session = await getSessionFromCookies(cookies);
  let user = null;

  if (session?.user?.id) {
    try {
      const users = await db.query(
        "SELECT id, name, email, role FROM users WHERE id = $1",
        [session.user.id],
      );
      if (users.length > 0) {
        user = users[0];
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  }

  // Pass user data as serializable props to client components
  const userData = user
    ? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      // Add any other properties you need
    }
    : null;

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ClientLayout initialUser={userData}>
            {children}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
