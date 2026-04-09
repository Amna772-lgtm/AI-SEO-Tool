"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user?.is_admin) return null;

  return (
    <div className="flex h-screen overflow-hidden text-[var(--foreground)]" style={{ background: "var(--background)" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
