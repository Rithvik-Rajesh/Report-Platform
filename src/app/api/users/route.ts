import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const users = await db.query(
            'SELECT id, name, email, roll_no, role, created_at FROM users ORDER BY created_at DESC'
        );

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
} 