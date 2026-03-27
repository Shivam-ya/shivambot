import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SHIVAM Chatbot – AI Chat Platform",
  description:
    "Enterprise-grade AI chat platform powered by next-generation language models. Experience the future of intelligence.",
  keywords: ["AI", "chat", "LLM", "SHIVAM Chatbot", "OpenRouter", "Llama", "Gemma"],
  openGraph: {
    title: "SHIVAM'S Chatbot – AI Chat Platform",
    description: "Enterprise-grade AI chat powered by next-gen models.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${inter.variable} ${GeistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange={false}
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
