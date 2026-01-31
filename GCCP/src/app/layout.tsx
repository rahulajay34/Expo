import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as suggested in design aesthetics
import "./globals.css";
import Providers from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ed-Tech Agentic Core",
  description: "Advanced educational content generation system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-white text-gray-900`}>
        <Providers>
          <AuthGuard>
            <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
              <Header />
              <div className="flex flex-1 min-h-0 overflow-hidden">
                <Sidebar />
                <main className="flex-1 p-6 overflow-auto">
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </main>
              </div>
            </div>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
