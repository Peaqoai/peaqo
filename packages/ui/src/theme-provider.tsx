"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

// re-export so existing imports of useTheme from here keep working
export { useTheme };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
