import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory store for rate limiting
// In production, consider using Redis or another distributed cache
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  }
}

const rateLimitStore: RateLimitStore = {};

// Constants for rate limiting
const RATE_LIMIT_MAX = 60; // Maximum requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // Window size in milliseconds (1 minute)

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000); // Clean up every minute

export async function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const path = request.nextUrl.pathname;
    
    // Create a unique key for this IP and path combination
    const rateLimitKey = `${ip}:${path}`;
    const now = Date.now();
    
    // Initialize or get the current rate limit data
    if (!rateLimitStore[rateLimitKey]) {
      rateLimitStore[rateLimitKey] = {
        count: 0,
        resetTime: now + RATE_LIMIT_WINDOW
      };
    }
    
    // Reset count if the window has passed
    if (rateLimitStore[rateLimitKey].resetTime < now) {
      rateLimitStore[rateLimitKey] = {
        count: 0,
        resetTime: now + RATE_LIMIT_WINDOW
      };
    }
    
    // Increment the request count
    rateLimitStore[rateLimitKey].count++;
    
    // Check if over limit
    if (rateLimitStore[rateLimitKey].count > RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitStore[rateLimitKey].resetTime - now) / 1000)),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimitStore[rateLimitKey].resetTime / 1000))
          }
        }
      );
    }
    
    // Add rate limit headers to the response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
    response.headers.set('X-RateLimit-Remaining', String(RATE_LIMIT_MAX - rateLimitStore[rateLimitKey].count));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitStore[rateLimitKey].resetTime / 1000)));
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // But not to static files or other non-API routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 