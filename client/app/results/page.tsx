"use client";

import Link from "next/link";
import * as React from "react";
import { Calendar, Eye, GraduationCap, ListChecks, Trash2, Upload } from "lucide-react";

import { Protected } from "@/components/Protected";
import { AppShell } from "@/components/AppShell";
import { FadeIn } from "@/components/Animated";
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

export default function ResultsIndexPage() {
  const [batches, setBatches] = React.useState<BatchSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/batches/recent");
      setBatches(res.data.batches || []);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Failed to load results";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteBatchById(id: string) {
    const ok = window.confirm("Delete this batch? This will remove all stored results for it.");
    if (!ok) return;
    setBusyId(id);
    setError(null);
    let prev: BatchSummary[] = [];
    setBatches((cur) => {
      prev = cur;
      return cur.filter((b) => b.id !== id);
    });
    try {
      await api.delete(`/batches/${id}`);
      await load();
    } catch (err: any) {
      setBatches(prev);
      const message = err?.response?.data?.error?.message || "Failed to delete batch";
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  return (
    <Protected>
      <AppShell>
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-blue-700" />
              Results
            </div>
          }
          subtitle="Browse your recent analyses"
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
            <Card>
              <CardHeader>
                <div className="text-base font-semibold text-slate-900">Recent Analysis</div>
                <div className="text-sm text-slate-600">Last uploaded batches</div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-slate-600">Loading...</div>
                ) : error ? (
                  <div className="text-sm text-red-600">{error}</div>
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
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => deleteBatchById(b.id)}
                            disabled={busyId === b.id}
                            title="Delete batch"
                            className="text-rose-700 hover:text-rose-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
          </FadeIn>
        </main>
      </AppShell>
    </Protected>
  );
}
