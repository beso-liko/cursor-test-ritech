import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ThemeInitScript from "@/components/ThemeInitScript";
import { NotesProvider } from "@/components/notes/NotesProvider";
import { SuperuserProvider } from "@/components/SuperuserProvider";
import { getInitialIsSuperuser } from "@/lib/auth/get-initial-is-superuser";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "StudyBuddy - AI Study Assistant",
  description:
    "Upload documents, generate summaries, flashcards, quizzes, and chat with your study materials using AI.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialIsSuperuser = await getInitialIsSuperuser();

  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeInitScript />
        <GoogleAnalytics />
        <ClerkProvider
          appearance={{ theme: shadcn }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
        >
          <SuperuserProvider initialIsSuperuser={initialIsSuperuser}>
            <ThemeProvider>
              <LanguageProvider>
                <NotesProvider>
                  <TooltipProvider>{children}</TooltipProvider>
                </NotesProvider>
              </LanguageProvider>
            </ThemeProvider>
          </SuperuserProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
