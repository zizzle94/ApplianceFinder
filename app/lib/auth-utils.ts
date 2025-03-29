import { jwtVerify, createRemoteJWKSet } from 'jose';
import 'server-only';

// For Supabase JWT validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Create a JWKS (JSON Web Key Set) client for verifying JWTs
// This is more secure than using a shared secret
const jwksUrl = new URL('/.well-known/jwks.json', SUPABASE_URL).toString();
const remoteJWKS = createRemoteJWKSet(new URL(jwksUrl));

/**
 * Verify a JWT token from Supabase
 * 
 * @param token The JWT token to verify
 * @returns The decoded payload if valid, null otherwise
 */
export async function verifyJWT(token: string) {
  if (!token) return null;
  
  try {
    // For Supabase JWT, we should use the JWKS endpoint
    // This is more secure than using a shared secret
    const { payload } = await jwtVerify(token, remoteJWKS, {
      issuer: 'supabase',
      audience: 'authenticated',
    });
    
    return payload;
  } catch (error) {
    console.error('JWT validation failed:', error);
    return null;
  }
}

/**
 * Extract a token from Authorization header
 * 
 * @param authHeader The Authorization header value
 * @returns The token without the Bearer prefix, or null
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
}

/**
 * Complete JWT validation from Authorization header
 * 
 * @param authHeader The Authorization header value
 * @returns The decoded payload if valid, null otherwise
 */
export async function validateAuthHeader(authHeader: string | null) {
  const token = extractTokenFromHeader(authHeader);
  if (!token) return null;
  
  return verifyJWT(token);
} 