import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Suspense } from 'react'
import Navbar from '@/components/navbar'
import Sidebar from '@/components/sidebar'
import { ChatProvider } from '@/context/chat-context'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'TrebleAI - Music Theory Learning',
  description: 'AI-powered music theory learning platform with sheet music analysis and interactive practice',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="dark bg-background text-foreground" suppressHydrationWarning>
        <ChatProvider>
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
          <div className="flex flex-col min-h-screen md:pl-64">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </ChatProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
