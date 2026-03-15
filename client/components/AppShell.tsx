"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { BarChart3, LayoutDashboard, ListChecks, Upload } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/results", label: "Results", icon: ListChecks },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { teacher, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(37,99,235,0.14),transparent_55%),radial-gradient(900px_circle_at_90%_20%,rgba(124,58,237,0.10),transparent_55%),linear-gradient(to_bottom,#f8fafc,#ffffff_60%,#ffffff)]">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200/70 bg-white/80 backdrop-blur md:block">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 px-5 py-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-violet-600 text-white shadow-sm">
                <Upload className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">MSBTE Result Analyzer</div>
                <div className="truncate text-xs text-slate-600">Teacher Dashboard</div>
              </div>
            </div>

            <nav className="grid gap-1 px-3">
              {nav.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition " +
                      (active
                        ? "bg-slate-900/5 text-slate-900"
                        : "text-slate-700 hover:bg-slate-900/5 hover:text-slate-900")
                    }
                  >
                    <Icon className={"h-4 w-4 " + (active ? "text-blue-700" : "text-slate-500")} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{teacher?.name || "Teacher"}</div>
                  <div className="truncate text-xs text-slate-600">{teacher?.email || ""}</div>
                </div>
                <Button variant="secondary" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
