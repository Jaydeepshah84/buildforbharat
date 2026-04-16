import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "react-hot-toast";
import ClientProviders from "@/components/ClientProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learnify - AI Learning Platform",
  description: "AI-Powered Adaptive Education Ecosystem",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <LanguageProvider>
            <ClientProviders>
              <Toaster position="top-right" />
              {children}
            </ClientProviders>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
