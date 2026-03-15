"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  BarChart3,
  BookOpen,
  FileDown,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Sparkles,
  Upload,
  User,
} from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "Teacher Dashboard",
    items: [
      { href: "/dashboard", label: "Teacher Dashboard", icon: LayoutDashboard },
      { href: "/results", label: "Results History", icon: ListChecks },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/upload", label: "Upload", icon: Upload },
      { href: "/exports", label: "Smart Reports", icon: FileDown },
    ],
  },
  {
    title: "Tools & Resources",
    items: [
      { href: "/documentation", label: "Documentation", icon: BookOpen },
      { href: "/smart-edu-hub", label: "Smart Edu Hub", icon: GraduationCap },
      { href: "/about", label: "About", icon: User },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { teacher, logout } = useAuth();

  const initials = String(teacher?.name || "Teacher")
    .split(/\s+/g)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(37,99,235,0.14),transparent_55%),radial-gradient(900px_circle_at_90%_20%,rgba(124,58,237,0.10),transparent_55%),linear-gradient(to_bottom,#f8fafc,#ffffff_60%,#ffffff)]">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200/70 bg-white/80 backdrop-blur md:block">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 px-5 py-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-violet-600 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-wide text-slate-900">MSBTE Result</div>
                <div className="truncate text-[11px] font-medium tracking-[0.22em] text-slate-600">
                  ANALYZER SYSTEM
                </div>
              </div>
            </div>

            <nav className="grid gap-4 px-3">
              {navSections.map((section) => (
                <div key={section.title} className="grid gap-1">
                  <div className="px-3 pt-1 text-[11px] font-semibold tracking-[0.18em] text-slate-500">
                    {section.title.toUpperCase()}
                  </div>
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={
                          "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition " +
                          (active
                            ? "bg-blue-600/10 text-slate-900"
                            : "text-slate-700 hover:bg-slate-900/5 hover:text-slate-900")
                        }
                      >
                        <Icon className={"h-4 w-4 " + (active ? "text-blue-700" : "text-slate-500")} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="mt-auto border-t border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-sm font-semibold text-blue-700">
                    {initials || "T"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{teacher?.name || "Teacher"}</div>
                    <div className="truncate text-xs text-slate-600">TEACHER</div>
                  </div>
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
