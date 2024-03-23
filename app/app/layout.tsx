import "~/styles/globals.css";

import { Inter } from "next/font/google";

import "@radix-ui/themes/styles.css"

import { Container, Flex, Theme, ThemePanel } from "@radix-ui/themes"
import TabsSelect from "./Nav";
import { Toaster } from "shadcn/Sonner";
export const runtime = "edge"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Financial Tools",
  description: "Created by TJW",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable}`}>
        <Theme appearance="dark">
          <div className="flex min-h-screen flex-col">
            <header className="py-8" />
            <TabsSelect />
            <main className="flex-1">
              <Container size="3" p="2">
                <Flex direction="column" align="center" gap="4">
                  {children}
                </Flex>
              </Container>
            </main>
            {/* <Footer /> */}
            <Toaster />
          </div>
        </Theme>
      </body>
    </html>
  );
}
