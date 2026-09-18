import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HOST MARKET PLACE — Cyberpunk Marketplace",
  description: "Premium digital mods, tools, and enhancements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-black text-white selection:bg-primary selection:text-black overflow-hidden`}>
        <AuthProvider>
          <div className="flex h-screen w-full">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative particle-overlay">
              {/* Scanline overlay effect */}
              <div className="absolute inset-0 pointer-events-none z-0" 
                style={{
                  background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
                  backgroundSize: "100% 2px, 3px 100%"
                }}
              />
              
              <TopHeader />
              
              <main className="flex-1 overflow-y-auto relative z-10 p-6 md:p-8">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
