"use client";

import * as React from "react";
import { BookOpen, CheckCircle2, ShieldCheck } from "lucide-react";

import { Protected } from "@/components/Protected";
import { AppShell } from "@/components/AppShell";
import { FadeIn } from "@/components/Animated";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DocumentationPage() {
  return (
    <Protected>
      <AppShell>
        <PageHeader title="Documentation" subtitle="How to use the system effectively" />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-6">
            <FadeIn>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <BookOpen className="h-4 w-4 text-blue-700" />
                      Basic Workflow
                    </div>
                    <div className="text-sm text-slate-600">Upload → Fetch → Analyze → Export</div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 text-sm text-slate-700">
                      <div className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                        <div>
                          Upload your Excel (.xlsx) and choose primary identifier (Seat No / Enrollment No).
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                        <div>
                          Start result fetching, enter CAPTCHA when prompted, and let the job continue automatically.
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                        <div>
                          Review analytics and export formatted Excel reports.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <ShieldCheck className="h-4 w-4 text-violet-700" />
                      CAPTCHA Notes
                    </div>
                    <div className="text-sm text-slate-600">Designed to be teacher-assisted</div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 text-sm text-slate-700">
                      <div>
                        The app pauses when CAPTCHA is required and resumes after you continue.
                      </div>
                      <div>
                        If CAPTCHA is wrong or session expires, it prompts again without losing batch progress.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </FadeIn>
          </div>
        </main>
      </AppShell>
    </Protected>
  );
}
