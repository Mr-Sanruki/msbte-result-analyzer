"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, Lock, Mail, User } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { FadeIn, HoverLift } from "@/components/Animated";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        role: "teacher",
      });
      router.push("/dashboard");
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || "Registration failed";
      setError("root", { message });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <FadeIn>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-700 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">MSBTE Result Analyzer</h1>
            <p className="mt-2 text-slate-600">Create your teacher account</p>
          </div>
        </FadeIn>

        <HoverLift>
          <Card>
            <CardHeader>
              <div className="text-lg font-semibold text-slate-900">Register</div>
              <div className="text-sm text-slate-600">Teacher role only</div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input className="pl-10" placeholder="Your name" {...register("name")} />
                  </div>
                  {errors.name?.message ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input className="pl-10" type="email" placeholder="teacher@example.com" {...register("email")} />
                  </div>
                  {errors.email?.message ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input className="pl-10" type="password" placeholder="Minimum 6 characters" {...register("password")} />
                  </div>
                  {errors.password?.message ? <p className="text-sm text-red-600">{errors.password.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input className="pl-10" type="password" placeholder="Re-enter password" {...register("confirmPassword")} />
                  </div>
                  {errors.confirmPassword?.message ? (
                    <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                  ) : null}
                </div>

                {errors.root?.message ? <p className="text-sm text-red-600">{errors.root.message}</p> : null}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Button>

                <p className="text-center text-sm text-slate-600">
                  Already have an account?{" "}
                  <Link className="font-medium text-blue-700 hover:underline" href="/login">
                    Login
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </HoverLift>

        <FadeIn delay={0.08}>
          <div className="mt-8 text-center">
            <Link className="text-sm text-slate-600 hover:underline" href="/">
              Back
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
