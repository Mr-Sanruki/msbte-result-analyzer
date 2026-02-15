"use client";

import * as React from "react";
import { BarChart3, GraduationCap, Percent, Trophy } from "lucide-react";

import { Protected } from "@/components/Protected";
import { AppShell } from "@/components/AppShell";
import { FadeIn } from "@/components/Animated";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";

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

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = React.useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/batches/analytics/summary");
        setAnalytics(res.data || null);
      } catch (err: any) {
        const message = err?.response?.data?.error?.message || "Failed to load analytics";
        setError(message);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <Protected>
      <AppShell>
        <PageHeader title="Analytics" subtitle="Class-level performance insights" />

        <main className="mx-auto max-w-6xl px-4 py-8">
          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : !analytics ? (
            <div className="text-sm text-slate-600">No analytics available yet.</div>
          ) : (
            <div className="grid gap-6">
              <FadeIn>
                <div className="grid gap-6 md:grid-cols-4">
                  <StatCard
                    tone="blue"
                    label="Total Students"
                    value={analytics.totals.totalStudents}
                    icon={<GraduationCap className="h-5 w-5" />}
                  />
                  <StatCard
                    tone="green"
                    label="Pass Rate"
                    value={`${analytics.totals.passRate}%`}
                    icon={<Percent className="h-5 w-5" />}
                  />
                  <StatCard
                    tone="orange"
                    label="Pass / Fail"
                    value={`${analytics.totals.pass} / ${analytics.totals.fail}`}
                    icon={<BarChart3 className="h-5 w-5" />}
                  />
                  <StatCard
                    tone="purple"
                    label="Topper"
                    value={
                      <span className="text-base">
                        {analytics.topper.name || "-"}
                        {typeof analytics.topper.percentage === "number" ? ` (${analytics.topper.percentage}%)` : ""}
                      </span>
                    }
                    icon={<Trophy className="h-5 w-5" />}
                  />
                </div>
              </FadeIn>

              <FadeIn delay={0.06}>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <div className="text-base font-semibold text-slate-900">Class Distribution</div>
                      <div className="text-sm text-slate-600">Top categories</div>
                    </CardHeader>
                    <CardContent>
                      <PieChart
                        data={analytics.classDistribution.slice(0, 6).map((d, idx) => {
                          const colors = ["#2563eb", "#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#64748b"];
                          return { label: d.label, value: d.value, color: colors[idx % colors.length] };
                        })}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="text-base font-semibold text-slate-900">Subject Averages</div>
                      <div className="text-sm text-slate-600">Top subjects by average %</div>
                    </CardHeader>
                    <CardContent>
                      <BarChart
                        data={analytics.subjectAverages
                          .filter((s) => typeof s.avgPercentage === "number")
                          .slice(0, 10)
                          .map((s) => ({ label: s.subject, value: Number(s.avgPercentage || 0) }))}
                      />
                    </CardContent>
                  </Card>
                </div>
              </FadeIn>

              <FadeIn delay={0.12}>
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold text-slate-900">Pass / Fail</div>
                    <div className="text-sm text-slate-600">Overall outcome split</div>
                  </CardHeader>
                  <CardContent>
                    <PieChart
                      data={[
                        { label: "Pass", value: analytics.totals.pass, color: "#10b981" },
                        { label: "Fail", value: analytics.totals.fail, color: "#ef4444" },
                      ]}
                    />
                  </CardContent>
                </Card>
              </FadeIn>
            </div>
          )}
        </main>
      </AppShell>
    </Protected>
  );
}
