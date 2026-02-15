"use client";

import Link from "next/link";
import * as React from "react";
import { useParams } from "next/navigation";
import {
  BarChart3,
  Download,
  FileSearch,
  Filter,
  GraduationCap,
  IdCard,
  Search,
  Percent,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Trophy,
  Eye,
} from "lucide-react";

import { Protected } from "@/components/Protected";
import { useAuth } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";

type FetchState = {
  batchId: string;
  status:
    | "not_started"
    | "idle"
    | "ready_for_captcha"
    | "submitting"
    | "completed"
    | "failed";
  currentIndex?: number;
  total?: number;
  currentEnrollment?: string | null;
  lastError?: string | null;
};

type BatchAnalytics = {
  totals: {
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
  };
  classDistribution: Array<{ label: string; value: number }>;
  subjectAverages: Array<{ subject: string; avgPercentage: number | null; samples: number }>;
};

type StudentResult = {
  enrollmentNumber: string;
  name?: string;
  seatNumber?: string;
  percentage?: number;
  resultStatus?: "Pass" | "Fail" | "Unknown";
  resultClass?: string;
  fetchedAt?: string;
  errorMessage?: string;
  subjectMarks?: Record<
    string,
    {
      faThMax?: number | string | null;
      faThObt?: number | string | null;
      saThMax?: number | string | null;
      saThObt?: number | string | null;
      totalMax?: number | string | null;
      totalObt?: number | string | null;
      faPrMax?: number | string | null;
      faPrObt?: number | string | null;
      saPrMax?: number | string | null;
      saPrObt?: number | string | null;
      slaMax?: number | string | null;
      slaObt?: number | string | null;
      credits?: number | string | null;
    }
  >;
};

type Batch = {
  id: string;
  uploadDate: string;
  totalStudents: number;
  status: "created" | "fetching" | "completed" | "failed";
  results: StudentResult[];
  errors: string[];
};

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const batchId = params.id;

  const { teacher, loading: authLoading } = useAuth();

  const [batch, setBatch] = React.useState<Batch | null>(null);
  const [state, setState] = React.useState<FetchState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "Pass" | "Fail" | "Unknown" | "Error">(
    "all"
  );
  const [sortKey, setSortKey] = React.useState<"enrollment" | "percentage_desc" | "percentage_asc">(
    "enrollment"
  );
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const [analytics, setAnalytics] = React.useState<BatchAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = React.useState(true);

  const [captchaPngBase64, setCaptchaPngBase64] = React.useState<string | null>(null);
  const [captchaText, setCaptchaText] = React.useState<string>("");
  const [captchaError, setCaptchaError] = React.useState<string | null>(null);

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setSortKey("enrollment");
  }

  async function loadBatch() {
    try {
      const res = await api.get(`/batches/${batchId}`);
      setBatch(res.data.batch);
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      throw err;
    }
  }

  async function refreshAll() {
    setError(null);
    setBusy("refresh");
    try {
      await Promise.all([loadBatch(), loadState(), loadAnalytics()]);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Refresh failed";
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function loadAnalytics() {
    setLoadingAnalytics(true);
    try {
      const res = await api.get(`/batches/${batchId}/analytics`);
      setAnalytics(res.data || null);
    } catch {
      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function reparse() {
    setError(null);
    setBusy("reparse");
    try {
      await api.post(`/batches/${batchId}/reparse`);
      await loadBatch();
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Re-parse failed";
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function resetFailedUnknown() {
    setError(null);
    setBusy("reset");
    try {
      // Ensure any existing puppeteer job is closed so start() relaunches the MSBTE flow.
      try {
        await api.post(`/batches/${batchId}/fetch/stop`);
      } catch {
        // ignore
      }

      await api.post(`/batches/${batchId}/reset`, { includeUnknown: true });
      await loadBatch();

      // Restart fetch flow so reset records actually get re-fetched.
      const res = await api.post(`/batches/${batchId}/fetch/start`);
      setState(res.data.state);
      await Promise.all([loadBatch(), loadState(), loadAnalytics()]);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Reset failed";
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function downloadExcel() {
    setError(null);
    setBusy("download");
    try {
      const res = await api.get(`/batches/${batchId}/export.xlsx`, { responseType: "blob" });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `msbte_batch_${batchId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Download failed";
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function loadState() {
    try {
      const res = await api.get(`/batches/${batchId}/fetch/status`);
      setState(res.data.state);
    } catch (err: any) {
      if (err?.response?.status === 401) return;
      throw err;
    }
  }

  async function loadCaptcha() {
    setCaptchaError(null);
    try {
      const res = await api.get(`/batches/${batchId}/fetch/captcha`);
      setCaptchaPngBase64(res.data.pngBase64 || null);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Failed to load CAPTCHA";
      setCaptchaError(message);
      setCaptchaPngBase64(null);
    }
  }

  React.useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        if (!authLoading && teacher) {
          await Promise.all([loadBatch(), loadState()]);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, authLoading, teacher]);

  React.useEffect(() => {
    if (authLoading || !teacher) return;

    const t = setInterval(() => {
      loadBatch().catch(() => null);
      loadState().catch(() => null);
    }, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, authLoading, teacher]);

  React.useEffect(() => {
    if (authLoading || !teacher) return;
    loadAnalytics().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, authLoading, teacher]);

  React.useEffect(() => {
    if (authLoading || !teacher) return;
    if (state?.status === "ready_for_captcha") {
      loadCaptcha().catch(() => null);
    } else {
      setCaptchaPngBase64(null);
      setCaptchaText("");
      setCaptchaError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status, authLoading, teacher, batchId]);

  async function start() {
    setError(null);
    setBusy("start");
    try {
      const res = await api.post(`/batches/${batchId}/fetch/start`);
      setState(res.data.state);
      await loadBatch();
      setCaptchaText("");
      setCaptchaPngBase64(null);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Failed to start";
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function cont() {
    setError(null);
    setCaptchaError(null);
    setBusy("continue");
    try {
      const res = await api.post(`/batches/${batchId}/fetch/continue`, {
        captcha: captchaText,
      });
      setState(res.data.state);
      await loadBatch();
      if (res.data?.info === "captcha_empty") {
        setCaptchaError("Enter CAPTCHA to continue.");
      }
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Failed to continue";
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  async function stop() {
    setError(null);
    setBusy("stop");
    try {
      await api.post(`/batches/${batchId}/fetch/stop`);
      await Promise.all([loadBatch(), loadState()]);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Failed to stop";
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  const doneCount = React.useMemo(() => {
    if (!batch) return 0;
    return batch.results.filter((r) => r.fetchedAt || r.errorMessage).length;
  }, [batch]);

  const filteredResults = React.useMemo(() => {
    const list = [...(batch?.results || [])];

    const q = query.trim().toLowerCase();
    const matchesQuery = (r: StudentResult) => {
      if (!q) return true;
      return (
        r.enrollmentNumber?.toLowerCase().includes(q) ||
        (r.name || "").toLowerCase().includes(q) ||
        (r.seatNumber || "").toLowerCase().includes(q)
      );
    };

    const matchesStatus = (r: StudentResult) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "Error") return Boolean(r.errorMessage);
      return (r.resultStatus || "Unknown") === statusFilter;
    };

    const filtered = list.filter((r) => matchesQuery(r) && matchesStatus(r));

    filtered.sort((a, b) => {
      if (sortKey === "enrollment") {
        return String(a.enrollmentNumber).localeCompare(String(b.enrollmentNumber));
      }
      const ap = typeof a.percentage === "number" ? a.percentage : -1;
      const bp = typeof b.percentage === "number" ? b.percentage : -1;
      if (sortKey === "percentage_asc") return ap - bp;
      return bp - ap;
    });

    return filtered;
  }, [batch?.results, query, sortKey, statusFilter]);

  return (
    <Protected>
      <AppShell>
        <PageHeader
          title="Student Results"
          subtitle={batchId}
          backHref="/results"
          backLabel="Back"
          actions={
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={refreshAll} disabled={busy !== null}>
                <RefreshCw className={"mr-2 h-4 w-4 " + (busy === "refresh" ? "animate-spin" : "")} />
                Refresh
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadExcel} disabled={busy !== null}>
                <Download className="mr-2 h-4 w-4" />
                {busy === "download" ? "Preparing..." : "Export Excel"}
              </Button>
            </div>
          }
        />

        <main className="mx-auto max-w-6xl px-4 py-8">
          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : (
            <div className="grid gap-6">
              {error ? (
                <Card>
                  <CardContent className="py-4">
                    <div className="text-sm text-red-600">{error}</div>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <div className="text-base font-semibold text-slate-900">Result Fetcher</div>
                  <div className="text-sm text-slate-600"> || !captchaText.trim()
                    Start the MSBTE browser flow, enter CAPTCHA in opened browser, then Continue here.
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-stop"}
                        </Button>
                      </div>

                      {state?.status === "ready_for_captcha" ? (
                        <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold text-slate-900">CAPTCHA</div>
                          <div className="mt-1 text-xs text-slate-600">
                            Enter the CAPTCHA shown below, then press Continue.
                          </div>

                          {captchaError ? <div className="mt-2 text-xs text-red-600">{captchaError}</div> : null}

                          {captchaPngBase64 ? (
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="rounded-2xl border border-slate-200 bg-white p-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  alt="captcha"
                                  src={`data:image/png;base64,${captchaPngBase64}`}
                                  className="h-16 w-auto"
                                />
                              </div>
                              <div className="flex-1">
                                <input
                                  value={captchaText}
                                  onChange={(e) => setCaptchaText(e.target.value)}
                                  placeholder="Type CAPTCHA"
                                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                                />
                                <div className="mt-2 flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => loadCaptcha()}
                                    disabled={busy !== null}
                                  >
                                    Refresh CAPTCHA
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 flex ilems-center justify-between gap-3">
                              <div className="text-xs text-slate-600">Laading CAPTCHA...</div>
                              <Button
                                tyte="buttone
                                variant="secondary"
                                size="sm"
                                onClick={() => loadCaptcha()-200 bg-white p-4">
                                disabled={busy !== null}
 <d                           >
                                Retry
                              iv class>
                            </divN
                          )}ame="text-xs text-slate-600">Job Status</div>
                        <div c
                      ) : null}lassName="mt-1 text-sm font-semibold text-slate-900">{state?.status || "-"}</div>
                      <div className="mt-2 text-xs text-slate-600">
                        Current enrollment: <span className="font-medium">{state?.currentEnrollment || "-"}</span>
                      </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-600">Progress</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {doneCount}/{batch?.totalStudents || 0}
                      </div>
                      {state?.lastError ? (
                        <div className="mt-2 text-xs text-red-600">Last error: {state.lastError}</div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-600">&nbsp;</div>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-600">Controls</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={start} disabled={busy !== null}>
                          <Play className="mr-2 h-4 w-4" />
                          {busy === "start" ? "Starting..." : "Start"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={cont}
                          disabled={busy !== null || state?.status !== "ready_for_captcha"}
                        >
                          {busy === "continue" ? "Continuing..." : "Continue"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={stop} disabled={busy !== null}>
                          <Square className="mr-2 h-4 w-4" />
                          {busy === "stop" ? "Stopping..." : "Stop"}
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={reparse} disabled={busy !== null}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {busy === "reparse" ? "Re-parsing..." : "Re-parse"}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={resetFailedUnknown} disabled={busy !== null}>
                          {busy === "reset" ? "Resetting..." : "Retry Failed/Unknown"}
                        </Button>
                      </div>

                      <div className="mt-3 text-xs text-slate-600">
                        Continue is enabled only when waiting for CAPTCHA.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="text-base font-semibold text-slate-900">Batch Analytics</div>
                  <div className="text-sm text-slate-600">Quick performance summary for this batch</div>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <div className="text-sm text-slate-600">Loading...</div>
                  ) : !analytics ? (
                    <div className="text-sm text-slate-600">No analytics available yet.</div>
                  ) : (
                    <div className="grid gap-6">
                      <div className="grid gap-4 md:grid-cols-4">
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

                      <div className="grid gap-6 md:grid-cols-2">
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
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <FileSearch className="h-4 w-4 text-slate-600" />
                    Students
                  </div>
                  <div className="text-sm text-slate-600">Search, filter, and open a student to see subject-wise marks.</div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Filter className="h-4 w-4 text-slate-600" />
                        Filters & Search
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={clearFilters}>
                          Clear Filters
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Search className="h-3.5 w-3.5" />
                          Search
                        </div>
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Enrollment / name / seat"
                          className="mt-1 w-full bg-transparent text-sm outline-none"
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-xs text-slate-600">Status</div>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as any)}
                          className="mt-1 w-full bg-white py-0.5 text-sm text-slate-900 outline-none"
                        >
                          <option value="all">All</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                          <option value="Unknown">Unknown</option>
                          <option value="Error">Error</option>
                        </select>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-xs text-slate-600">Sort</div>
                        <select
                          value={sortKey}
                          onChange={(e) => setSortKey(e.target.value as any)}
                          className="mt-1 w-full bg-white py-0.5 text-sm text-slate-900 outline-none"
                        >
                          <option value="enrollment">Enrollment</option>
                          <option value="percentage_desc">Percentage (high to low)</option>
                          <option value="percentage_asc">Percentage (low to high)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Enrollment</th>
                          <th className="px-4 py-3">Seat</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">% / Class</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Fetched</th>
                          <th className="px-4 py-3">Error</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((r) => {
                          const isOpen = expanded === r.enrollmentNumber;
                          const subjects = r.subjectMarks ? Object.entries(r.subjectMarks) : [];
                          const showPercent = typeof r.percentage === "number" ? `${r.percentage}%` : "-";

                          return (
                            <React.Fragment key={r.enrollmentNumber}>
                              <tr className="border-t border-slate-200">
                                <td className="px-4 py-3 font-medium text-slate-900">{r.enrollmentNumber}</td>
                                <td className="px-4 py-3 text-slate-700">{r.seatNumber || "-"}</td>
                                <td className="px-4 py-3 text-slate-700">{r.name || "-"}</td>
                                <td className="px-4 py-3 text-slate-700">
                                  <div className="font-medium text-slate-900">{showPercent}</div>
                                  <div className="text-xs text-slate-600">{r.resultClass || "-"}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {(() => {
                                    const label = r.errorMessage ? "Error" : r.resultStatus || "Unknown";
                                    const cls =
                                      label === "Pass"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : label === "Fail"
                                          ? "bg-rose-50 text-rose-700 border-rose-100"
                                          : label === "Error"
                                            ? "bg-amber-50 text-amber-700 border-amber-100"
                                            : "bg-slate-50 text-slate-700 border-slate-200";
                                    return (
                                      <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${cls}`}>
                                        {label}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {r.fetchedAt ? new Date(r.fetchedAt).toLocaleString() : "-"}
                                </td>
                                <td className="px-4 py-3 text-red-600">{r.errorMessage || ""}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Link href={`/results/${batchId}/students/${encodeURIComponent(r.enrollmentNumber)}`}>
                                      <Button variant="secondary" size="sm">
                                        <IdCard className="mr-2 h-4 w-4" />
                                        Profile
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() =>
                                        setExpanded((cur) => (cur === r.enrollmentNumber ? null : r.enrollmentNumber))
                                      }
                                      disabled={!r.subjectMarks}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      {isOpen ? "Hide" : "View"}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              {isOpen ? (
                                <tr className="border-t border-slate-200 bg-slate-50">
                                  <td className="px-4 py-4" colSpan={8}>
                                    <div className="text-xs text-slate-600">Subject-wise marks</div>
                                    {subjects.length === 0 ? (
                                      <div className="mt-2 text-sm text-slate-700">No subject marks parsed.</div>
                                    ) : (
                                      <div className="mt-3 overflow-auto rounded-xl border border-slate-200 bg-white">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                              <th className="px-3 py-2">Subject</th>
                                              <th className="px-3 py-2">Total</th>
                                              <th className="px-3 py-2">FA-TH</th>
                                              <th className="px-3 py-2">SA-TH</th>
                                              <th className="px-3 py-2">FA-PR</th>
                                              <th className="px-3 py-2">SA-PR</th>
                                              <th className="px-3 py-2">SLA</th>
                                              <th className="px-3 py-2">Credits</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {subjects.map(([sub, m]) => (
                                              <tr key={sub} className="border-t border-slate-200">
                                                <td className="px-3 py-2 font-medium text-slate-900">{sub}</td>
                                                <td className="px-3 py-2 text-slate-700">
                                                  {m.totalObt ?? "-"} / {m.totalMax ?? "-"}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">
                                                  {m.faThObt ?? "-"} / {m.faThMax ?? "-"}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">
                                                  {m.saThObt ?? "-"} / {m.saThMax ?? "-"}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">
                                                  {m.faPrObt ?? "-"} / {m.faPrMax ?? "-"}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">
                                                  {m.saPrObt ?? "-"} / {m.saPrMax ?? "-"}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">
                                                  {m.slaObt ?? "-"} / {m.slaMax ?? "-"}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">{m.credits ?? "-"}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </AppShell>
    </Protected>
  );
}
