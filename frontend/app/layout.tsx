import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NavigationProvider } from "@/context/NavigationContext";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import UserGuideModal from "@/components/UserGuideModal";
import FloatingSupportButton from "@/components/FloatingSupportButton";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  metadataBase: new URL("https://hostmarketplace.store"),
  title: {
    default: "Host Market Place",
    template: "%s | Host Market Place",
  },
  description: "Digital marketplace for game modifications, tools, and enhancements with wallet and order management.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Host Market Place",
    description: "Digital marketplace for game modifications, tools, and enhancements with wallet and order management.",
    url: "https://hostmarketplace.store",
    siteName: "Host Market Place",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Host Market Place",
    description: "Digital marketplace for game modifications, tools, and enhancements with wallet and order management.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06080e",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrains.variable} font-sans min-h-screen bg-[#06080e] text-foreground selection:bg-primary selection:text-black overflow-hidden`}
      >
        <AuthProvider>
          <NavigationProvider>
            <div className="flex h-screen w-full relative bg-[#06080e] overflow-x-hidden">
              {/* Cinematic Ambient Atmosphere Background */}
              <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/3 w-[800px] h-[500px] bg-primary/[0.04] blur-[150px] rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-[700px] h-[500px] bg-secondary/[0.04] blur-[160px] rounded-full" />
                <div
                  className="absolute inset-0 opacity-[0.14]"
                  style={{
                    backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
                    backgroundSize: "36px 36px",
                  }}
                />
              </div>

              {/* Left Sidebar (Desktop Static + Mobile Drawer) */}
              <Sidebar />

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 min-w-0">
                <TopHeader />

                <main className="flex-1 overflow-y-auto relative z-10 p-3 sm:p-6 md:p-8">
                  {children}
                </main>
              </div>

              {/* Global Knowledge Base & User Guide Modal */}
              <UserGuideModal />

              {/* Floating Telegram Support Button */}
              <FloatingSupportButton />
            </div>
          </NavigationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
