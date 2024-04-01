import "~/styles/globals.css"
import "@radix-ui/themes/styles.css"

import { Inter } from "next/font/google"

import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"

import { Container, Flex, Theme } from "@radix-ui/themes"
import TabsSelect from "./Nav"
export const runtime = "edge"


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata = {
  title: "Financial Tools",
  description: "Created by TJW",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      {/* <body className={`font-sans ${inter.variable}`}> */}
      <body className={`font-sans`}>
        <Theme appearance="dark">
          <div className="flex min-h-screen flex-col">
            <span className="py-4 sm:py-8" />
            <TabsSelect />
            <main className="flex-1">
              <Container size="3" p="2">
                <Flex direction="column" align="center" gap="4">
                  {children}
                </Flex>
              </Container>
            </main>
          </div>
        </Theme>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
