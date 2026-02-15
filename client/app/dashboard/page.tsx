"use client";

import Link from "next/link";
import * as React from "react";
import { BarChart3, Calendar, Eye, GraduationCap, Percent, Sparkles, Trophy, Upload } from "lucide-react";

import { Protected } from "@/components/Protected";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { FadeIn } from "@/components/Animated";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";

type BatchSummary = {
  id: string;
  uploadDate: string;
  totalStudents: number;
  passCount: number;
  failCount: number;
  topperName: string | null;
  topperPercentage: number | null;
  status: "created" | "fetching" | "completed" | "failed";
};

type AnalyticsSummary = {
  totals: {
    batches: number;
    totalStudents: number;
    pass: number;
    fail: number;
    passRate: number;
  };
  topper: {
    name: string | null;
    percentage: number | null;
    enrollmentNumber: string | null;
    seatNumber: string | null;
    batchId: string | null;
  };
  classDistribution: Array<{ label: string; value: number }>;
  subjectAverages: Array<{ subject: string; avgPercentage: number | null; samples: number }>;
};

export default function DashboardPage() {
  const { teacher } = useAuth();

  const [batches, setBatches] = React.useState<BatchSummary[]>([]);
  const [loadingBatches, setLoadingBatches] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [analytics, setAnalytics] = React.useState<AnalyticsSummary | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        setLoadError(null);
        const [recentRes, analyticsRes] = await Promise.all([
          api.get("/batches/recent"),
          api.get("/batches/analytics/summary"),
        ]);
        setBatches(recentRes.data.batches || []);
        setAnalytics(analyticsRes.data || null);
      } catch (err: any) {
        if (err?.response?.status === 429) {
          setLoadError("Too many requests. Please wait a few seconds and refresh.");
          return;
        }
        if (err?.response?.status === 401) {
          setLoadError("Session expired. Please login again.");
          return;
        }
        setLoadError("Failed to load dashboard data.");
      } finally {
        setLoadingBatches(false);
        setLoadingAnalytics(false);
      }
    }

    load();
  }, []);

  const totals = React.useMemo(() => {
    const totalStudents = analytics?.totals.totalStudents ?? batches.reduce((acc, b) => acc + (b.totalStudents || 0), 0);
    const passRate = analytics?.totals.passRate ?? 0;
    const topperName = analytics?.topper?.name || "-";
    const topperPercentage = analytics?.topper?.percentage ?? null;
    const avg = passRate;
    return {
      totalStudents,
      passRate,
      topperName,
      topperPercentage,
      avg,
    };
  }, [analytics, batches]);

  return (
    <Protected>
      <AppShell>
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-700" />
              <span>
                Welcome back, <span className="font-semibold">{teacher?.name}</span>
              </span>
            </div>
          }
          subtitle="Here's what's happening with your students' performance today."
          actions={
            <Link href="/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Excel
              </Button>
            </Link>
          }
        />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <FadeIn>
            <div className="grid gap-6 md:grid-cols-4">
              <StatCard
                tone="blue"
                label="Total Students"
                value={totals.totalStudents}
                hint={<>Batches analyzed</>}
                icon={<GraduationCap className="h-5 w-5" />}
              />
              <StatCard
                tone="green"
                label="Pass Rate"
                value={`${totals.passRate}%`}
                hint={<>Overall performance</>}
                icon={<Percent className="h-5 w-5" />}
              />
              <StatCard
                tone="purple"
                label="Class Topper"
                value={
                  <span className="text-base">
                    {totals.topperName}
                    {typeof totals.topperPercentage === "number" ? ` (${totals.topperPercentage}%)` : ""}
                  </span>
                }
                hint={<>Top scorer</>}
                icon={<Trophy className="h-5 w-5" />}
              />
              <StatCard
                tone="orange"
                label="Average Score"
                value={`${totals.avg}%`}
                hint={<>Avg percentage</>}
                icon={<BarChart3 className="h-5 w-5" />}
              />
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="text-base font-semibold text-slate-900">Recent Analysis</div>
                  <div className="text-sm text-slate-600">Last 5 uploaded batches</div>
                </CardHeader>
                <CardContent>
                  {loadingBatches ? (
                    <div className="text-sm text-slate-600">Loading...</div>
                  ) : loadError ? (
                    <div className="text-sm text-red-600">{loadError}</div>
                  ) : batches.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="mt-4 text-sm font-semibold text-slate-900">No batches yet</div>
                      <div className="mt-1 text-sm text-slate-600">Upload an Excel file to start analyzing results.</div>
                      <div className="mt-5">
                        <Link href="/upload">
                          <Button variant="secondary" size="sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Excel
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {batches.map((b) => (
                        <div
                          key={b.id}
                          className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <Calendar className="h-4 w-4 text-slate-600" />
                                {new Date(b.uploadDate).toLocaleString()}
                              </div>
                              {(() => {
                                const cls =
                                  b.status === "completed"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : b.status === "fetching"
                                      ? "bg-blue-50 text-blue-700 border-blue-100"
                                      : b.status === "failed"
                                        ? "bg-rose-50 text-rose-700 border-rose-100"
                                        : "bg-slate-50 text-slate-700 border-slate-200";
                                return (
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
                                    {b.status}
                                  </span>
                                );
                              })()}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                                <GraduationCap className="h-3.5 w-3.5" />
                                {b.totalStudents} students
                              </span>
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                Pass {b.passCount}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                                Fail {b.failCount}
                              </span>
                              {b.topperName ? (
                                <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                                  {b.topperName}
                                </span>
                              ) : null}
                              {typeof b.topperPercentage === "number" ? (
                                <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                  Topper {b.topperPercentage}%
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="shrink-0">
                            <Link href={`/results/${b.id}`}>
                              <Button variant="secondary" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <BarChart3 className="h-4 w-4 text-blue-700" />
                  Charts
                </div>
                <div className="text-sm text-slate-600">Class distribution and subject performance</div>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <div className="text-sm text-slate-600">Loading...</div>
                ) : !analytics ? (
                  <div className="text-sm text-slate-600">No analytics available yet.</div>
                ) : (
                  <div className="grid gap-6">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Class Distribution</div>
                      <div className="mt-3 grid gap-2">
                        {analytics.classDistribution.slice(0, 6).map((it) => {
                          const max = analytics.classDistribution[0]?.value || 1;
                          const pct = Math.round((it.value / max) * 100);
                          return (
                            <div key={it.label} className="grid gap-1">
                              <div className="flex items-center justify-between text-xs text-slate-700">
                                <div className="truncate">{it.label}</div>
                                <div className="tabular-nums">{it.value}</div>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-gradient-to-r from-slate-900 to-slate-700" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-slate-900">Top Subjects (Avg %)</div>
                      <div className="mt-3 grid gap-2">
                        {analytics.subjectAverages.slice(0, 6).map((it) => {
                          const pct = Math.max(0, Math.min(100, Math.round(it.avgPercentage || 0)));
                          return (
                            <div key={it.subject} className="grid gap-1">
                              <div className="flex items-center justify-between text-xs text-slate-700">
                                <div className="truncate">{it.subject}</div>
                                <div className="tabular-nums">{it.avgPercentage?.toFixed(2) ?? "-"}%</div>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </FadeIn>
        </main>
      </AppShell>
    </Protected>
  );
}
