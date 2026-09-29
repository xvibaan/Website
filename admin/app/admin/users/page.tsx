"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminUsersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/customers");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs font-mono text-gray-500">
      Redirecting to Customer Management...
    </div>
  );
}
