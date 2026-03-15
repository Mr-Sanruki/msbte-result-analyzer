"use client";

import * as React from "react";
import { GraduationCap, Lightbulb, Sparkles } from "lucide-react";

import { Protected } from "@/components/Protected";
import { AppShell } from "@/components/AppShell";
import { FadeIn } from "@/components/Animated";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SmartEduHubPage() {
  return (
    <Protected>
      <AppShell>
        <PageHeader title="Smart Edu Hub" subtitle="Teaching tools, ideas, and classroom insights" />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-6">
            <FadeIn>
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <GraduationCap className="h-4 w-4 text-blue-700" />
                      Student Support
                    </div>
                    <div className="text-sm text-slate-600">Simple interventions</div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-700">
                      Identify weak subjects early using subject-wise averages and help students with targeted practice.
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <Lightbulb className="h-4 w-4 text-amber-700" />
                      KT Strategy
                    </div>
                    <div className="text-sm text-slate-600">Reduce backlog</div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-700">
                      Use the KT distribution view to plan remedial sessions and track improvements across batches.
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <Sparkles className="h-4 w-4 text-violet-700" />
                      Smart Reports
                    </div>
                    <div className="text-sm text-slate-600">Ready-to-share exports</div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-700">
                      Generate clean Excel summaries for class performance, toppers, and subject-wise marks.
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
