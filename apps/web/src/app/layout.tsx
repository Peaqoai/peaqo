import type { Metadata } from "next";
import "./globals.css";
import { Hanken_Grotesk, JetBrains_Mono, MuseoModerno } from "next/font/google";
import { cn } from "@peaqo/ui/lib/utils";
import NextTopLoader from "nextjs-toploader";
import { TRPCProvider } from "@/lib/trpc/provider";
import { ThemeProvider } from "@peaqo/ui/theme-provider";
import { Toaster } from "@peaqo/ui/components/sonner";

const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const museoModerno = MuseoModerno({ subsets: ["latin"], variable: "--font-brand" });

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
    <html lang="en" className={cn("font-sans", sans.variable, mono.variable, museoModerno.variable)} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <NextTopLoader color="oklch(0.6 0.2 255)" showSpinner={false} />
          <TRPCProvider>{children}</TRPCProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
