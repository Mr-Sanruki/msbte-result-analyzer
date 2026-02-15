"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  async function onSubmit(values: FormValues) {
    try {
      await login({ email: values.email, password: values.password });
      router.push("/dashboard");
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Login failed";
      setError("root", { message });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">MSBTE Result Manager</h1>
          <p className="mt-2 text-slate-600">Sign in to your teacher account</p>
        </div>

        <Card>
          <CardHeader>
            <div className="text-lg font-semibold text-slate-900">Login</div>
            <div className="text-sm text-slate-600">Enter your email and password</div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input type="email" placeholder="teacher@example.com" {...register("email")} />
                {errors.email?.message ? (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input type="password" placeholder="••••••••" {...register("password")} />
                {errors.password?.message ? (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                ) : null}
              </div>

              {errors.root?.message ? (
                <p className="text-sm text-red-600">{errors.root.message}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Don&apos;t have an account?{" "}
                <Link className="font-medium text-blue-700 hover:underline" href="/register">
                  Register
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link className="text-sm text-slate-600 hover:underline" href="/">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
