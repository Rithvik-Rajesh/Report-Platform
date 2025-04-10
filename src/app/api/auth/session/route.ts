import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, getSessionPayload } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
    
    const payload = getSessionPayload(session);
    
    return NextResponse.json({
      authenticated: true,
      user: payload
    });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}