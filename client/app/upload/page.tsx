"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter } from "next/navigation";

import { Protected } from "@/components/Protected";
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
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Upload Result Excel" subtitle=".xlsx only" backHref="/dashboard" backLabel="Back" />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <Card>
            <CardHeader>
              <div className="text-base font-semibold text-slate-900">Upload</div>
              <div className="text-sm text-slate-600">Upload .xlsx with Enrollment Numbers</div>
            </CardHeader>
            <CardContent>
              <div
                className={
                  "rounded-3xl border border-dashed bg-white p-10 text-center transition " +
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
                <div className="text-sm font-medium text-slate-900">Drag & drop Excel file here</div>
                <div className="mt-1 text-sm text-slate-600">or click to browse</div>
                <input
                  className="mt-6 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => pickFile(e.target.files?.[0] || null)}
                />

                {file ? (
                  <div className="mt-4 text-sm text-slate-700">
                    Selected: <span className="font-medium">{file.name}</span>
                  </div>
                ) : null}

                {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button disabled={!file || progress !== null} onClick={upload}>
                    {progress === null ? "Upload & Extract" : progress < 100 ? `Uploading ${progress}%` : "Uploaded"}
                  </Button>
                  {batchId ? (
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/results/${batchId}`)}
                    >
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
                        Extracted enrollment numbers (showing up to 20)
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
        </main>
      </div>
    </Protected>
  );
}
