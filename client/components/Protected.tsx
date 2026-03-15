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

  if (loading) return null;
  if (!teacher) return null;

  return <>{children}</>;
}
