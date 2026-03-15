"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Info, Upload, Wand2 } from "lucide-react";

import { Protected } from "@/components/Protected";
import { AppShell } from "@/components/AppShell";
import { FadeIn } from "@/components/Animated";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [enrollments, setEnrollments] = React.useState<string[] | null>(null);
  const [batchId, setBatchId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function pickFile(f: File | null) {
    setError(null);
    setEnrollments(null);
    setBatchId(null);
    setProgress(null);

    if (!f) {
      setFile(null);
      return;
    }

    const ok = f.name.toLowerCase().endsWith(".xlsx");
    if (!ok) {
      setFile(null);
      setError("Only .xlsx files are allowed");
      return;
    }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setError(null);
    setProgress(0);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await api.post("/batches/upload", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const p = Math.round((evt.loaded / evt.total) * 100);
          setProgress(p);
        },
      });

      setEnrollments(res.data.enrollments || []);
      setBatchId(res.data.batch?.id || null);
      setProgress(100);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Upload failed";
      setError(message);
      setProgress(null);
    }
  }

  return (
    <Protected>
      <AppShell>
        <PageHeader title="Upload Excel" subtitle=".xlsx only" backHref="/dashboard" backLabel="Back" />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <FadeIn>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <FileSpreadsheet className="h-4 w-4 text-blue-700" />
                      Upload
                    </div>
                    <div className="text-sm text-slate-600">Upload .xlsx with Seat Numbers (preferred)</div>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={
                        "rounded-3xl border border-dashed bg-gradient-to-b from-white to-slate-50 p-10 text-center shadow-sm transition " +
                        (dragOver
                          ? "border-blue-600 ring-2 ring-blue-600/20"
                          : "border-slate-300")
                      }
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOver(true);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOver(false);
                        const f = e.dataTransfer.files?.[0] || null;
                        pickFile(f);
                      }}
                    >
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">Drag & drop Excel file here</div>
                      <div className="mt-1 text-sm text-slate-600">or click to browse</div>
                      <input
                        className="mt-6 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => pickFile(e.target.files?.[0] || null)}
                      />

                      {file ? (
                        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-800">
                          Selected: <span className="font-medium">{file.name}</span>
                        </div>
                      ) : null}

                      {typeof progress === "number" ? (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <div>Uploading</div>
                            <div className="tabular-nums">{progress}%</div>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      ) : null}

                      {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

                      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button disabled={!file || progress !== null} onClick={upload}>
                          <Wand2 className="mr-2 h-4 w-4" />
                          {progress === null ? "Upload & Extract" : progress < 100 ? `Uploading ${progress}%` : "Uploaded"}
                        </Button>
                        {batchId ? (
                          <Button variant="secondary" onClick={() => router.push(`/results/${batchId}`)}>
                            View Batch
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {enrollments ? (
                      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-base font-semibold text-slate-900">Preview</div>
                            <div className="text-sm text-slate-600">
                              Extracted seat numbers (showing up to 20)
                            </div>
                          </div>
                          <div className="text-sm font-medium text-slate-900">{enrollments.length} students</div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {enrollments.slice(0, 20).map((e) => (
                            <div key={e} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-800">
                              {e}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="border-slate-200 bg-white/80 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <Info className="h-4 w-4 text-violet-700" />
                      Tips
                    </div>
                    <div className="text-sm text-slate-600">A quick checklist before uploading</div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 text-sm">
                      <div className="rounded-2xl bg-blue-50 px-4 py-3 text-slate-800">
                        <div className="text-xs font-semibold text-blue-700">Step 1</div>
                        <div className="mt-1">Upload your Excel (.xlsx) with seat numbers</div>
                      </div>
                      <div className="rounded-2xl bg-violet-50 px-4 py-3 text-slate-800">
                        <div className="text-xs font-semibold text-violet-700">Step 2</div>
                        <div className="mt-1">Open batch → Start fetch → enter CAPTCHA in browser</div>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-slate-800">
                        <div className="text-xs font-semibold text-emerald-700">Step 3</div>
                        <div className="mt-1">Continue fetch → export Excel report</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </FadeIn>
        </main>
      </AppShell>
    </Protected>
  );
}
