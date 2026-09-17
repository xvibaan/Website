"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only evaluate authorization after the initial session loading is complete
    if (!loading) {
      if (!user) {
        // Not logged in at all -> redirect to login
        router.replace("/login");
      } else if (user.role !== "admin") {
        // Logged in, but lacks admin privileges -> redirect to standard dashboard
        router.replace("/dashboard");
      }
    }
  }, [user, loading, router]);

  // While checking session state, show a centered loading spinner
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  // If user is missing or isn't an admin, return null to prevent rendering 
  // any admin content while the router.replace executes in the background.
  if (!user || user.role !== "admin") {
    return null;
  }

  // Authorized Admin -> render the admin content
  return <>{children}</>;
}
