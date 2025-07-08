import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReferralGuard - AI-Powered Referral Leakage Detection",
  description: "Advanced healthcare analytics dashboard for detecting and preventing referral leakage using machine learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://cdn.tailwindcss.com" async></script>
      </head>
      <body className="bg-black dark:bg-black text-white min-h-screen">
        <nav className="bg-black bg-opacity-80 shadow-sm border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="ml-2 text-xl font-bold text-white">ReferralGuard</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <a className="text-gray-200 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium" href="/">
                  Dashboard
                </a>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
} 