"use client";

import Link from "next/link";
import * as React from "react";
import { FileDown, FileSpreadsheet, Layers, RefreshCw, ShieldCheck, Trophy, Users } from "lucide-react";

import { Protected } from "@/components/Protected";
import { AppShell } from "@/components/AppShell";
import { FadeIn, HoverLift } from "@/components/Animated";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type RecentBatch = {
  id: string;
  uploadDate: string;
  totalStudents: number;
  status: "created" | "fetching" | "completed" | "failed";
  topperName?: string | null;
  topperPercentage?: number | null;
};

type RecentResponse = { batches: RecentBatch[] };

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export default function ExportsPage() {
  const [batches, setBatches] = React.useState<RecentBatch[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<RecentResponse>("/batches/recent", { params: { limit: 50 } });
      setBatches(res.data?.batches || []);
      const firstId = res.data?.batches?.[0]?.id || null;
      setActiveId((cur) => cur || firstId);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Failed to load batches";
      setError(message);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load().catch(() => null);
  }, []);

  const active = (activeId ? batches.find((b) => String(b.id) === String(activeId)) : null) || batches?.[0] || null;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  async function downloadReport(report: "pass" | "fail" | "kt" | "toppers" | "all" | "full") {
    if (!active?.id) return;
    setDownloading(report);
    try {
      const path =
        report === "full"
          ? `/batches/${active.id}/export.xlsx`
          : `/batches/${active.id}/reports/${report}.xlsx`;

      const res = await api.get(path, { responseType: "blob" });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `msbte_${active.id}_${report}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Protected>
      <AppShell>
        <PageHeader
          title="Smart Reports"
          subtitle="Generate and download customized academic performance records."
          actions={
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          }
        />

        <main className="mx-auto max-w-6xl px-4 py-8">
          {loading ? (
            <div className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <div className="h-[260px] rounded-3xl border border-slate-200 bg-white/70 p-5 animate-pulse" />
                <div className="h-[260px] rounded-3xl border border-slate-200 bg-white/70 p-5 animate-pulse" />
              </div>
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : !active ? (
            <div className="text-sm text-slate-600">No batches found. Upload an Excel file to start generating reports.</div>
          ) : (
            <div className="grid gap-6">
              <FadeIn>
                <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                  <Card>
                    <CardHeader>
                      <div className="text-sm font-semibold text-slate-900">{fmtDate(active.uploadDate)}</div>
                      <div className="text-xs text-slate-600">
                        {active.totalStudents} students
                        <span className="mx-2 text-slate-300">•</span>
                        {String(active.status || "-").toUpperCase()}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <div className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">ALL RECORDS</div>
                          <div className="grid gap-2">
                            {batches.map((b) => {
                              const isActive = String(b.id) === String(active.id);
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => setActiveId(String(b.id))}
                                  className={
                                    "w-full rounded-2xl border px-3 py-2 text-left text-sm transition " +
                                    (isActive
                                      ? "border-blue-600/30 bg-blue-600/10"
                                      : "border-slate-200 bg-white hover:bg-slate-50")
                                  }
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-slate-900">{fmtDate(b.uploadDate)}</div>
                                      <div className="mt-0.5 text-xs text-slate-600">{b.totalStudents} students</div>
                                    </div>
                                    <div className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                                      {String(b.status || "-").toUpperCase()}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-3xl border border-slate-200 bg-white p-4">
                            <div className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">STUDENTS</div>
                            <div className="mt-2 text-xl font-semibold text-slate-900">{active.totalStudents}</div>
                          </div>
                          <div className="rounded-3xl border border-slate-200 bg-white p-4">
                            <div className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">TOPPER</div>
                            <div className="mt-2 text-sm font-semibold text-slate-900">
                              {active.topperName || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              {typeof active.topperPercentage === "number" ? `${active.topperPercentage}%` : ""}
                            </div>
                          </div>
                        </div>

                        <Link href={`/results/${active.id}`}>
                          <Button variant="secondary" className="w-full">
                            View Batch
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">Export configurations</div>
                          <div className="text-sm text-slate-600">Format: MSBTE Standard</div>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                          {batches.length} records detected
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 md:grid-cols-2">
                        <HoverLift>
                          <button
                            type="button"
                            onClick={() => downloadReport("pass")}
                            disabled={!baseUrl || downloading !== null}
                            className={"block text-left " + (!baseUrl ? "pointer-events-none opacity-60" : "")}
                          >
                            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                  <Users className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">Pass Students</div>
                                  <div className="text-[11px] text-slate-600">Excel document</div>
                                </div>
                              </div>
                              <FileDown className="h-4 w-4 text-slate-400" />
                            </div>
                          </button>
                        </HoverLift>

                        <HoverLift>
                          <button
                            type="button"
                            onClick={() => downloadReport("fail")}
                            disabled={!baseUrl || downloading !== null}
                            className={"block text-left " + (!baseUrl ? "pointer-events-none opacity-60" : "")}
                          >
                            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                                  <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">Fail Students</div>
                                  <div className="text-[11px] text-slate-600">Excel document</div>
                                </div>
                              </div>
                              <FileDown className="h-4 w-4 text-slate-400" />
                            </div>
                          </button>
                        </HoverLift>

                        <HoverLift>
                          <button
                            type="button"
                            onClick={() => downloadReport("kt")}
                            disabled={!baseUrl || downloading !== null}
                            className={"block text-left " + (!baseUrl ? "pointer-events-none opacity-60" : "")}
                          >
                            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                                  <Layers className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">KT Analysis</div>
                                  <div className="text-[11px] text-slate-600">Excel document</div>
                                </div>
                              </div>
                              <FileDown className="h-4 w-4 text-slate-400" />
                            </div>
                          </button>
                        </HoverLift>

                        <HoverLift>
                          <button
                            type="button"
                            onClick={() => downloadReport("toppers")}
                            disabled={!baseUrl || downloading !== null}
                            className={"block text-left " + (!baseUrl ? "pointer-events-none opacity-60" : "")}
                          >
                            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                                  <Trophy className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">Top Achievers</div>
                                  <div className="text-[11px] text-slate-600">Excel document</div>
                                </div>
                              </div>
                              <FileDown className="h-4 w-4 text-slate-400" />
                            </div>
                          </button>
                        </HoverLift>

                        <HoverLift>
                          <button
                            type="button"
                            onClick={() => downloadReport("full")}
                            disabled={!baseUrl || downloading !== null}
                            className={"block text-left " + (!baseUrl ? "pointer-events-none opacity-60" : "")}
                          >
                            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                                  <FileSpreadsheet className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">Full Consolidated</div>
                                  <div className="text-[11px] text-slate-600">Excel document</div>
                                </div>
                              </div>
                              <FileDown className="h-4 w-4 text-slate-400" />
                            </div>
                          </button>
                        </HoverLift>
                      </div>

                      <div className="mt-5 flex justify-end">
                        <Button
                          onClick={() => downloadReport("all")}
                          disabled={!baseUrl || downloading !== null}
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            {downloading ? "Downloading..." : "Download All Reports"}
                        </Button>
                      </div>

                      {!baseUrl ? (
                        <div className="mt-3 text-xs text-amber-700">
                          NEXT_PUBLIC_API_BASE_URL is not set, so downloads are disabled.
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              </FadeIn>
            </div>
          )}
        </main>
      </AppShell>
    </Protected>
  );
}
