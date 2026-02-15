"use client";

import Link from "next/link";
import * as React from "react";
import { useParams } from "next/navigation";

import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type SubjectMarksEntry = {
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
};

type StudentResult = {
  enrollmentNumber: string;
  seatNumber?: string | null;
  name?: string | null;
  totalMarks?: number | null;
  percentage?: number | null;
  resultStatus?: "Pass" | "Fail" | "Unknown";
  resultClass?: string | null;
  fetchedAt?: string | null;
  errorMessage?: string | null;
  subjectMarks?: Record<string, SubjectMarksEntry> | null;
};

type StudentDetailResponse = {
  batch: {
    id: string;
    uploadDate: string;
    status: string;
    totalStudents: number;
  };
  student: StudentResult;
};

function fmt(v: any) {
  if (v === null || v === undefined || v === "" || v === "-" || v === "--") return "-";
  return String(v);
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string; enrollment: string }>();
  const batchId = params?.id;
  const enrollment = params?.enrollment ? decodeURIComponent(String(params.enrollment)) : "";

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<StudentDetailResponse | null>(null);

  React.useEffect(() => {
    async function load() {
      if (!batchId || !enrollment) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/batches/${batchId}/students/${encodeURIComponent(enrollment)}`);
        setData(res.data);
      } catch (err: any) {
        const message = err?.response?.data?.error?.message || "Failed to load student";
        setError(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [batchId, enrollment]);

  const student = data?.student;
  const subjects = React.useMemo(() => {
    const sm = student?.subjectMarks;
    if (!sm || typeof sm !== "object") return [] as Array<[string, SubjectMarksEntry]>;
    return Object.entries(sm);
  }, [student?.subjectMarks]);

  return (
    <Protected>
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          title="Student Profile"
          subtitle={
            <>
              Enrollment: <span className="font-medium text-slate-900">{enrollment || "-"}</span>
            </>
          }
          backHref={`/results/${batchId}`}
          backLabel="Back to Batch"
        />

        <main className="mx-auto max-w-6xl px-4 py-8">
          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : !student ? (
            <div className="text-sm text-slate-600">No data found.</div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <div className="text-xs text-slate-600">Name</div>
                    <div className="text-base font-semibold text-slate-900">{student.name || "-"}</div>
                  </CardHeader>
                  <CardContent />
                </Card>
                <Card>
                  <CardHeader>
                    <div className="text-xs text-slate-600">Seat No</div>
                    <div className="text-base font-semibold text-slate-900">{student.seatNumber || "-"}</div>
                  </CardHeader>
                  <CardContent />
                </Card>
                <Card>
                  <CardHeader>
                    <div className="text-xs text-slate-600">Percentage</div>
                    <div className="text-base font-semibold text-slate-900">
                      {typeof student.percentage === "number" ? `${student.percentage}%` : "-"}
                    </div>
                    <div className="text-xs text-slate-600">{student.resultClass || "-"}</div>
                  </CardHeader>
                  <CardContent />
                </Card>
                <Card>
                  <CardHeader>
                    <div className="text-xs text-slate-600">Status</div>
                    <div className="text-base font-semibold text-slate-900">
                      {student.errorMessage ? "Error" : student.resultStatus || "Unknown"}
                    </div>
                    <div className="text-xs text-red-600">{student.errorMessage || ""}</div>
                  </CardHeader>
                  <CardContent />
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="text-base font-semibold text-slate-900">Subject-wise Marks</div>
                  <div className="text-sm text-slate-600">Detailed breakdown parsed from MSBTE statement</div>
                </CardHeader>
                <CardContent>
                  {subjects.length === 0 ? (
                    <div className="text-sm text-slate-600">No subject marks parsed yet.</div>
                  ) : (
                    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Subject</th>
                            <th className="px-4 py-3">Total</th>
                            <th className="px-4 py-3">FA-TH</th>
                            <th className="px-4 py-3">SA-TH</th>
                            <th className="px-4 py-3">FA-PR</th>
                            <th className="px-4 py-3">SA-PR</th>
                            <th className="px-4 py-3">SLA</th>
                            <th className="px-4 py-3">Credits</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map(([sub, m]) => (
                            <tr key={sub} className="border-t border-slate-200">
                              <td className="px-4 py-3 font-medium text-slate-900">{sub}</td>
                              <td className="px-4 py-3 text-slate-700">
                                {fmt(m.totalObt)} / {fmt(m.totalMax)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {fmt(m.faThObt)} / {fmt(m.faThMax)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {fmt(m.saThObt)} / {fmt(m.saThMax)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {fmt(m.faPrObt)} / {fmt(m.faPrMax)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {fmt(m.saPrObt)} / {fmt(m.saPrMax)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {fmt(m.slaObt)} / {fmt(m.slaMax)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">{fmt(m.credits)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold text-slate-900">Fetch Metadata</div>
                    <div className="text-sm text-slate-600">Debug / trace information</div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-slate-600">Fetched At</div>
                        <div className="font-medium text-slate-900">
                          {student.fetchedAt ? new Date(student.fetchedAt).toLocaleString() : "-"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-slate-600">Total Marks</div>
                        <div className="font-medium text-slate-900">{typeof student.totalMarks === "number" ? student.totalMarks : "-"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="text-base font-semibold text-slate-900">Batch</div>
                    <div className="text-sm text-slate-600">Context for this student</div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-slate-600">Batch Status</div>
                        <div className="font-medium text-slate-900">{data?.batch?.status || "-"}</div>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-slate-600">Upload Date</div>
                        <div className="font-medium text-slate-900">
                          {data?.batch?.uploadDate ? new Date(data.batch.uploadDate).toLocaleString() : "-"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </Protected>
  );
}
