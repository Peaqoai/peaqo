import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import NextTopLoader from "nextjs-toploader";
import { TRPCProvider } from "@/lib/trpc/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Peaqo — Chat with every AI model in one place",
    template: "%s · Peaqo",
  },
  description:
    "Peaqo is a multi-model AI chat app. Talk to GPT, Claude, Gemini, Groq and more from a single, fast interface with credits, web search, and file attachments.",
  applicationName: "Peaqo",
  keywords: ["AI chat", "GPT", "Claude", "Gemini", "multi-model", "LLM", "Peaqo"],
  openGraph: {
    title: "Peaqo — Chat with every AI model in one place",
    description:
      "One interface for GPT, Claude, Gemini, Groq and more — with web search, attachments, and credits.",
    siteName: "Peaqo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Peaqo — Chat with every AI model in one place",
    description: "One interface for GPT, Claude, Gemini, Groq and more.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <NextTopLoader color="oklch(0.6 0.2 255)" showSpinner={false} />
          <TRPCProvider>{children}</TRPCProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
