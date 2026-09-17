import "./globals.css"
import "qweather-icons/font/qweather-icons.css"
import "@/themes/theme.css"
import { ThemeProvider } from "@/components/ui/ThemeProvider"
import { Metadata } from "next"
import { Clarity } from "@/components/analytics/Clarity"
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

import { getWebsiteConfig } from "@/lib/notion"
import { mergeConfig } from "@/config"

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export async function generateMetadata(): Promise<Metadata> {
  const config = mergeConfig(await getWebsiteConfig())
  
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    title: {
      default: config.SITE_TITLE || "Ezho导航",
      template: `%s | ${config.SITE_TITLE || "Ezho工具箱"}`,
    },
    description: config.SITE_DESCRIPTION || "Ezho工具箱，超级个体需要知道的各种好用工具",
    keywords: config.SITE_KEYWORDS?.split(',') || ["AI导航", "超级个体", "工具箱"],
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      url: '/',
      title: config.SITE_TITLE,
      description: config.SITE_DESCRIPTION,
      siteName: config.SITE_TITLE,
    },
    twitter: {
      card: 'summary_large_image',
      title: config.SITE_TITLE,
      description: config.SITE_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const config = mergeConfig(await getWebsiteConfig())

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Clarity clarityId={config.CLARITY_ID || ''} />
        <GoogleAnalytics gaId={config.GA_ID || ''} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
