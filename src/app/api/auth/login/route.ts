
import { NextRequest, NextResponse } from 'next/server';
import { login, createSession } from '@/lib/auth';
import { setCookie } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const user = await login(email, password);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Create session and set cookie
    const sessionId = await createSession(user);
    
    const response = NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roll_no: user.roll_no,
        role: user.role
      }
    });
    
    // Set the session cookie
    response.headers.set('Set-Cookie', setCookie('quiz_session', sessionId));
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}