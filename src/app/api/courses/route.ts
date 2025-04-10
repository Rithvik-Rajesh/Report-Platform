import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { redis } from "@/lib/redis";

export async function GET(request: Request) {
    try {
        console.log("GET /api/courses - Request headers:", request.headers);
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
            console.log("GET /api/courses - No cookie header found");
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        const session = await getSessionFromCookies(cookieHeader);
        console.log("GET /api/courses - Session:", session);

        if (!session || !session.userId) {
            console.log("GET /api/courses - No session or userId");
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        const cachedCourses = await redis.get(`courses:${session.userId}`);
        if (cachedCourses) {
            console.log("GET /api/courses - Cache hit");
            return NextResponse.json(JSON.parse(cachedCourses));
        }
        console.log("GET /api/courses - Cache miss");

        const users = await db.query("SELECT * FROM users WHERE id = $1", [
            session.userId,
        ]);
        const user = users[0];
        console.log("GET /api/courses - User:", user);

        if (!user || user.role !== "STAFF") {
            console.log("GET /api/courses - User not found or not staff");
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Get all courses with student count
        const courses = await db.query(
            `SELECT 
                c.id,
                c.name,
                c.code,
                c.description,
                c.created_at,
                COUNT(cs.student_id) as student_count
            FROM courses c
            LEFT JOIN course_staff cf ON c.id = cf.course_id
            LEFT JOIN course_student cs ON c.id = cs.course_id
            WHERE cf.staff_id = $1
            GROUP BY c.id, c.name, c.code, c.description, c.created_at
            ORDER BY c.created_at DESC`,
            [user.id],
        );

        console.log("GET /api/courses - Courses found:", courses);

        await redis.setex(
            `courses:${session.userId}`,
            6000,
            JSON.stringify(courses),
        );

        return NextResponse.json(courses);
    } catch (error) {
        console.error("GET /api/courses - Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, {
            status: 500,
        });
    }
}

export async function POST(request: Request) {
    try {
        // Get the session cookie from the request headers
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Get the session from cookies
        const session = await getSessionFromCookies(cookieHeader);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Get the user from the session
        const users = await db.query(
            "SELECT * FROM users WHERE id = $1",
            [session.userId],
        );
        const user = users[0];

        if (!user || user.role !== "STAFF") {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Get the staff record for this user
        const staff = await db.query(
            "SELECT * FROM staff WHERE id = $1",
            [user.id],
        );

        if (!staff || staff.length === 0) {
            return NextResponse.json({ error: "Staff record not found" }, {
                status: 404,
            });
        }

        const { name, code, description } = await request.json();

        // Create the course
        const courses = await db.query(
            "INSERT INTO courses (name, code, description) VALUES ($1, $2, $3) RETURNING *",
            [name, code, description],
        );
        const course = courses[0];

        // Add staff to course using the staff.id
        await db.query(
            "INSERT INTO course_staff (course_id, staff_id, role) VALUES ($1, $2, $3)",
            [course.id, staff[0].id, "OWNER"],
        );

        await redis.del(`courses:${session.userId}`);

        return NextResponse.json(course);
    } catch (error) {
        console.error("Error in POST /api/courses:", error);
        return NextResponse.json({ error: "Internal Server Error" }, {
            status: 500,
        });
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Get the session cookie from the request headers
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Get the session from cookies
        const session = await getSessionFromCookies(cookieHeader);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Get the user from the session
        const users = await db.query(
            "SELECT * FROM users WHERE id = $1",
            [session.userId],
        );
        const user = users[0];

        if (!user || user.role !== "STAFF") {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Get the course ID from the URL
        const url = new URL(request.url);
        const courseId = url.pathname.split("/").pop();

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, {
                status: 400,
            });
        }

        const { name, code, description } = await request.json();

        if (!name || !code) {
            return NextResponse.json({ error: "Name and code are required" }, {
                status: 400,
            });
        }

        // Check if the staff member has access to this course
        const courseAccess = await db.query(
            "SELECT * FROM course_staff WHERE course_id = $1 AND staff_id = $2",
            [courseId, user.id],
        );

        if (!courseAccess || courseAccess.length === 0) {
            return NextResponse.json({
                error: "You do not have permission to edit this course",
            }, { status: 403 });
        }

        // Update the course
        const result = await db.query(
            "UPDATE courses SET name = $1, code = $2, description = $3 WHERE id = $4 RETURNING *",
            [name, code, description, courseId],
        );

        if (!result || result.length === 0) {
            return NextResponse.json({ error: "Course not found" }, {
                status: 404,
            });
        }

        const updatedCourse = result[0];

        // Get the student count for the updated course
        const studentCount = await db.query(
            "SELECT COUNT(*) as count FROM course_student WHERE course_id = $1",
            [courseId],
        );

        await redis.del(`courses:${session.userId}`);

        return NextResponse.json({
            ...updatedCourse,
            student_count: parseInt(studentCount[0].count),
        });
    } catch (error) {
        console.error("Error updating course:", error);
        return NextResponse.json({ error: "Failed to update course" }, {
            status: 500,
        });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Course ID is required" }, {
                status: 400,
            });
        }

        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Get the session from cookies
        const session = await getSessionFromCookies(cookieHeader);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // FIXED: Delete child records first to respect foreign key constraints
        // Delete related records first, then delete the course
        try {
            // Use a transaction to ensure all operations succeed or fail together
            await db.query("BEGIN");

            // Delete course_student records first
            await db.query("DELETE FROM course_student WHERE course_id = $1", [
                id,
            ]);

            // Delete course_staff records next
            await db.query("DELETE FROM course_staff WHERE course_id = $1", [
                id,
            ]);

            // Finally delete the course itself
            await db.query("DELETE FROM courses WHERE id = $1", [id]);

            // Commit the transaction
            await db.query("COMMIT");

            // Clear the cache
            await redis.del(`courses:${session.userId}`);

            return NextResponse.json(
                { message: "Course deleted successfully" },
                {
                    status: 200,
                },
            );
        } catch (error) {
            // Rollback on error
            await db.query("ROLLBACK");
            throw error;
        }
    } catch (error) {
        console.error("Error deleting course:", error);
        return NextResponse.json({ error: "Failed to delete course" }, {
            status: 500,
        });
    }
}
