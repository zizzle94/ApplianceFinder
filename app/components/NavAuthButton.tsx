'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth/AuthContext';

export function NavAuthButton() {
  const { user, signOut } = useAuth();
  
  if (user) {
    return (
      <button 
        onClick={signOut}
        className="text-sm font-medium hover:text-blue-600"
      >
        Sign Out
      </button>
    );
  }
  
  return (
    <Link href="/auth/login" className="text-sm font-medium hover:text-blue-600">
      Sign In
    </Link>
  );
} 