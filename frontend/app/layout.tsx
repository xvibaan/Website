import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HOST MARKET PLACE — Premium Digital Marketplace",
  description: "Instant delivery of software licenses, API keys, and digital products. Secure wallet checkout powered by Host Market Place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col mesh-bg`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 relative">
            {/* Global grid pattern overlay */}
            <div className="fixed inset-0 grid-pattern pointer-events-none opacity-40 z-0" />
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
