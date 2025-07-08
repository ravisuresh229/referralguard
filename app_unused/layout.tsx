import './globals.css';

export const metadata = {
  title: 'ReferralGuard',
  description: 'AI-Powered Referral Leakage Detection & Intervention',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
