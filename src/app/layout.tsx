import type { Metadata } from "next"
import { Lexend, Noto_Sans } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { DateProvider } from "@/context/DateContext"

const lexend = Lexend({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
})

const notoSans = Noto_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "DuoFit - Agora tem que ir!",
  description: "Foco na meta, sem segredo!",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${lexend.variable} ${notoSans.variable} antialiased`}>
        <AuthProvider>
          <DateProvider>
            {children}
          </DateProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

