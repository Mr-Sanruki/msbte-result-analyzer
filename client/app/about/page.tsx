"use client";

import * as React from "react";
import { BookOpen, GraduationCap, Sparkles } from "lucide-react";

import { Protected } from "@/components/Protected";
import { AppShell } from "@/components/AppShell";
import { FadeIn } from "@/components/Animated";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <Protected>
      <AppShell>
        <PageHeader title="About" subtitle="Meet the creator behind this project" />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-6">
            <FadeIn>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Sparkles className="h-4 w-4 text-violet-700" />
                    Mr. Sanruki
                  </div>
                  <div className="text-sm text-slate-600">Builder of MSBTE Result Analyzer</div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm text-slate-700">
                    <div className="leading-relaxed">
                      Hi, I’m <span className="font-semibold text-slate-900">Mr. Sanruki</span>. I built this tool to help teachers turn MSBTE
                      results into clear, actionable insights—faster, cleaner, and with export-ready reports.
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <BookOpen className="h-4 w-4 text-blue-700" />
                          Purpose
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          Reduce manual work in result analysis and provide accurate, downloadable academic summaries.
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <GraduationCap className="h-4 w-4 text-emerald-700" />
                          For Teachers
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          Built to support classroom decisions—topper trends, pass rate, KT patterns, and subject-wise performance.
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Sparkles className="h-4 w-4 text-violet-700" />
                          Quality Focus
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          Clean UI, smooth workflows, and exports that match the formats teachers actually need.
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                      <div className="text-sm font-semibold text-slate-900">Want to collaborate?</div>
                      <div className="mt-1 text-sm text-slate-600">
                        If you have suggestions or want new report formats, share your requirements and we’ll improve the tool together.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </main>
      </AppShell>
    </Protected>
  );
}
