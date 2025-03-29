import './globals.css';
import { Inter } from 'next/font/google';
import { ClientProviders } from './lib/ClientProviders';
import Link from 'next/link';
import ErrorBoundary from './components/ErrorBoundary';
import { NavAuthButton } from './components/NavAuthButton';

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Appliance Finder',
  description: 'Find the perfect appliance for your home',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <ClientProviders>
            <div className="flex flex-col min-h-screen">
              <header className="bg-white border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                  <Link href="/" className="text-xl font-bold">ApplianceFinder</Link>
                  <nav className="space-x-4">
                    <Link href="/" className="hover:text-blue-600">Home</Link>
                    <Link href="/pricing" className="hover:text-blue-600">Pricing</Link>
                    <Link href="/saved-appliances" className="hover:text-blue-600">Saved Appliances</Link>
                    <Link href="/query-history" className="hover:text-blue-600">Search History</Link>
                    <NavAuthButton />
                  </nav>
                </div>
              </header>
              <main className="flex-grow">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
              <footer className="bg-gray-100 py-6">
                <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
                  &copy; {new Date().getFullYear()} ApplianceFinder. All rights reserved.
                </div>
              </footer>
            </div>
          </ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  )
} 