import type { Metadata } from 'next'
import type { Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const shouldLoadVercelAnalytics =
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'AlgoLab | Algorithm Performance Analyzer',
    template: '%s | AlgoLab',
  },
  description:
    'Learn algorithms through interactive visualizations, real-time metrics, and empirical complexity analysis.',
  applicationName: 'AlgoLab',
  keywords: [
    'algorithm visualizer',
    'sorting algorithms',
    'complexity analysis',
    'big o notation',
    'computer science education',
  ],
  authors: [{ name: 'AlgoLab Team' }],
  creator: 'AlgoLab Team',
  publisher: 'AlgoLab',
  category: 'education',
  icons: {
    icon: [
      {
        url: '/algolab-icon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/algolab-icon.svg',
    apple: '/algolab-icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'AlgoLab',
    title: 'AlgoLab | Algorithm Performance Analyzer',
    description:
      'Explore sorting and search algorithms with step-by-step animations, metrics, and performance insights.',
    images: [
      {
        url: '/placeholder-logo.png',
        width: 1200,
        height: 630,
        alt: 'AlgoLab Algorithm Performance Analyzer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AlgoLab | Algorithm Performance Analyzer',
    description:
      'Interactive algorithm visualizations with live metrics and complexity analysis for learners and developers.',
    images: ['/placeholder-logo.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
          {shouldLoadVercelAnalytics && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
