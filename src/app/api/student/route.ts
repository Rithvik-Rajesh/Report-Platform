import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/utils';
import db from '@/lib/db';

export async function GET() {
    try {
        const students = await db.query(
            'SELECT id, email, roll_no, created_at FROM users WHERE role = $1 ORDER BY created_at DESC',
            ['STUDENT']
        );
        return NextResponse.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json(
            { error: 'Failed to fetch students' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { roll_no, password, course_id } = await request.json();

        if (!roll_no || !password || !course_id) {
            return NextResponse.json(
                { error: 'Roll number, password, and course ID are required' },
                { status: 400 }
            );
        }

        // Generate email from roll number
        const email = `${roll_no}@amrita.edu`;

        // Check if email already exists
        const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: 'Student with this roll number already exists' },
                { status: 409 }
            );
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Create user
        const result = await db.query(
            `INSERT INTO users (email, password, roll_no, role,name)
             VALUES ($1, $2, $3, $4,$5)
             RETURNING id`,
            [email, hashedPassword, roll_no, 'STUDENT', roll_no]
        );

        const userId = result[0].id;

        // Add to students table
        await db.query(
            'INSERT INTO students (id) VALUES ($1)',
            [userId]
        );

        // Add to course_student table
        await db.query(
            'INSERT INTO course_student (student_id, course_id) VALUES ($1, $2)',
            [userId, course_id]
        );

        return NextResponse.json({
            success: true,
            id: userId,
            email,
            roll_no
        });
    } catch (error) {
        console.error('Error creating student:', error);
        return NextResponse.json(
            { error: 'Failed to create student' },
            { status: 500 }
        );
    }
} 