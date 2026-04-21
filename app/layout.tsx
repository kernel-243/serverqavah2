import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
// import { Toaster } from "@/components/ui/toaster"
import type React from "react"
import { Toaster } from "react-hot-toast";
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "QavahLand",
  description: "Gestion de la vente des terrains de Qavah Group",
  generator: 'Qavah Group',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#001B38]`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <Toaster position="top-right" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'