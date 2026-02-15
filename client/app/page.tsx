import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import { FadeIn, HoverLift } from "@/components/Animated";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(37,99,235,0.18),transparent_55%),radial-gradient(1000px_circle_at_90%_20%,rgba(124,58,237,0.14),transparent_55%),linear-gradient(to_bottom,#eff6ff,#ffffff_55%,#ffffff)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-slate-900">MSBTE Result Analyzer</div>
            <div className="text-xs text-slate-600">Automated result processing for teachers</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="secondary">Login</Button>
          </Link>
          <Link href="/register">
            <Button>Register</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <FadeIn>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/70 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Fast • Accurate • Teacher-first
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                Upload once.
                <span className="block bg-gradient-to-r from-blue-700 to-violet-600 bg-clip-text text-transparent">
                  Fetch, analyze & export.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
                Upload your Excel with enrollment numbers, enter CAPTCHA only, and generate a filled Excel report with
                dashboards and analytics.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Open Dashboard
                  </Button>
                </Link>
              </div>

              <div className="mt-6 grid gap-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Exact totals & percentage extracted from MSBTE marksheet
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Built-in retries for failures/unknowns
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <HoverLift>
              <Card className="overflow-hidden border-slate-200 bg-white/80 backdrop-blur">
                <CardHeader>
                  <div className="text-base font-semibold text-slate-900">How it works</div>
                  <div className="text-sm text-slate-600">CAPTCHA is entered manually by the teacher</div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-2xl bg-blue-50 p-2 text-blue-700">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Upload Excel</div>
                        <div className="text-sm text-slate-600">Enrollment numbers column only</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-2xl bg-violet-50 p-2 text-violet-700">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Fetch results</div>
                        <div className="text-sm text-slate-600">Puppeteer automation + retries</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-2xl bg-emerald-50 p-2 text-emerald-700">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Analyze & export</div>
                        <div className="text-sm text-slate-600">Dashboard + download Excel report</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </HoverLift>
          </FadeIn>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <FadeIn delay={0.04}>
            <HoverLift>
              <Card className="border-slate-200 bg-white/80 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Upload className="h-4 w-4 text-blue-700" />
                    Bulk processing
                  </div>
                  <div className="text-sm text-slate-600">50–100 students with fault tolerance</div>
                </CardHeader>
                <CardContent />
              </Card>
            </HoverLift>
          </FadeIn>
          <FadeIn delay={0.08}>
            <HoverLift>
              <Card className="border-slate-200 bg-white/80 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <FileSpreadsheet className="h-4 w-4 text-violet-700" />
                    Excel export
                  </div>
                  <div className="text-sm text-slate-600">Same template in, filled template out</div>
                </CardHeader>
                <CardContent />
              </Card>
            </HoverLift>
          </FadeIn>
          <FadeIn delay={0.12}>
            <HoverLift>
              <Card className="border-slate-200 bg-white/80 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Lock className="h-4 w-4 text-emerald-700" />
                    Teacher access
                  </div>
                  <div className="text-sm text-slate-600">JWT authentication + hashed passwords</div>
                </CardHeader>
                <CardContent />
              </Card>
            </HoverLift>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}
