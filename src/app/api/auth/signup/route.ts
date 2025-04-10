import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/utils';
import db from '@/lib/db';


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, roll_no, role } = body;

        // Validate required fields
        if ((!name || !email || !password || !roll_no) || !role  ) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        if (role !== 'STUDENT' && role !== 'STAFF') {
            return NextResponse.json(
                { error: 'Invalid role' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1 OR roll_no = $2',
            [email, roll_no]
        );

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: 'Email or roll number already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        const result = await db.query(
            `INSERT INTO users (name, email, roll_no, password, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, roll_no, role`,
            [name, email, roll_no, hashedPassword, role]
        );

        if (role === 'STUDENT') {
            await db.query(
                'INSERT INTO students (id) VALUES ($1)',
                [result[0].id]
            );
        } else if (role === 'STAFF') {
            await db.query(
                'INSERT INTO staff (id) VALUES ($1)',
                [result[0].id]
            );
        }

        const user = result[0];

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                roll_no: user.roll_no,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Registration failed' },
            { status: 500 }
        );
    }
} 