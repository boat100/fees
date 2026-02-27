import { NextResponse } from 'next/server';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    
    if (authenticated) {
      const user = await getCurrentUser();
      return NextResponse.json({ 
        authenticated: true, 
        user 
      });
    } else {
      return NextResponse.json({ 
        authenticated: false 
      });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ 
      authenticated: false 
    });
  }
}
