import AdminRoute from "@/components/AdminRoute";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoute>
      {/* We apply a base layout wrapper for the admin section if needed later, 
          but for now, it simply ensures the AdminRoute protects all children */}
      <div className="admin-layout-wrapper">
        {children}
      </div>
    </AdminRoute>
  );
}
