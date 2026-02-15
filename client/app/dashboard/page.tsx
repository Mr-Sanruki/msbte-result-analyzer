"use client";

import Link from "next/link";
import * as React from "react";

import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
  const { teacher, logout } = useAuth();

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
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          title="Dashboard"
          subtitle={<>Welcome, {teacher?.name}</>}
          actions={
            <>
              <Link href="/upload">
                <Button>Upload Results</Button>
              </Link>
              <Button variant="secondary" onClick={logout}>
                Logout
              </Button>
            </>
          }
        />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader>
                <div className="text-sm text-slate-600">Total Students Analyzed</div>
                <div className="text-2xl font-semibold text-slate-900">{totals.totalStudents}</div>
              </CardHeader>
              <CardContent />
            </Card>
            <Card>
              <CardHeader>
                <div className="text-sm text-slate-600">Pass Rate</div>
                <div className="text-2xl font-semibold text-slate-900">{totals.passRate}%</div>
              </CardHeader>
              <CardContent />
            </Card>
            <Card>
              <CardHeader>
                <div className="text-sm text-slate-600">Class Topper</div>
                <div className="text-base font-semibold text-slate-900">
                  {totals.topperName}
                  {typeof totals.topperPercentage === "number" ? ` (${totals.topperPercentage}%)` : ""}
                </div>
              </CardHeader>
              <CardContent />
            </Card>
            <Card>
              <CardHeader>
                <div className="text-sm text-slate-600">Average Score</div>
                <div className="text-2xl font-semibold text-slate-900">{totals.avg}%</div>
              </CardHeader>
              <CardContent />
            </Card>
          </div>

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
                  <div className="text-sm text-slate-600">No batches yet.</div>
                ) : (
                  <div className="grid gap-3">
                    {batches.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {new Date(b.uploadDate).toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-600">
                            {b.totalStudents} students • status: {b.status}
                          </div>
                        </div>
                        <Link href={`/results/${b.id}`}>
                          <Button variant="secondary" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-base font-semibold text-slate-900">Charts</div>
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
                                <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
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
        </main>
      </div>
    </Protected>
  );
}
