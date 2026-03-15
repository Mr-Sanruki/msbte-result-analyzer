"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

export function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { teacher, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !teacher) {
      router.replace("/login");
    }
  }, [loading, teacher, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-16">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            <div className="text-sm font-medium text-slate-700">Loading...</div>
          </div>
        </div>
      </div>
    );
  }
  if (!teacher) return null;

  return <>{children}</>;
}
