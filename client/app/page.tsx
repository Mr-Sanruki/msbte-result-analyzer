import Link from "next/link";
import { BarChart3, GraduationCap, ShieldCheck, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">MSBTE Result Manager</div>
            <div className="text-xs text-slate-600">Automated MSBTE Result Processing for Teachers</div>
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

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Automated MSBTE Result Processing for Teachers
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
              Upload your Excel with enrollment numbers, enter CAPTCHA only, and get a fully filled,
              formatted Excel report with analytics.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <div className="text-base font-semibold text-slate-900">How it works</div>
              <div className="text-sm text-slate-600">CAPTCHA is entered manually by the teacher</div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-blue-50 p-2 text-blue-700">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Upload Excel</div>
                    <div className="text-sm text-slate-600">Enrollment numbers column only</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-blue-50 p-2 text-blue-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Fetch results</div>
                    <div className="text-sm text-slate-600">Puppeteer automation + retries</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-blue-50 p-2 text-blue-700">
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
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="text-base font-semibold text-slate-900">Bulk processing</div>
              <div className="text-sm text-slate-600">50–100 students with fault tolerance</div>
            </CardHeader>
            <CardContent />
          </Card>
          <Card>
            <CardHeader>
              <div className="text-base font-semibold text-slate-900">Exact Excel format</div>
              <div className="text-sm text-slate-600">Same template in, filled template out</div>
            </CardHeader>
            <CardContent />
          </Card>
          <Card>
            <CardHeader>
              <div className="text-base font-semibold text-slate-900">Secure teacher access</div>
              <div className="text-sm text-slate-600">JWT + hashed passwords</div>
            </CardHeader>
            <CardContent />
          </Card>
        </div>
      </main>
    </div>
  );
}
