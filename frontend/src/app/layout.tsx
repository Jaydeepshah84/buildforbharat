import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ed.Ai - AI Learning Platform",
  description: "AI-Powered Adaptive Education Ecosystem",
  icons: { icon: "/logo-brain.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <LanguageProvider>
            <Toaster position="top-right" />
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
