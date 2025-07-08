import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ReferralGuard - Healthcare Analytics Platform",
  description: "Premium healthcare referral analytics dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://cdn.tailwindcss.com" async></script>
      </head>
      <body className={`${inter.className} bg-black text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
