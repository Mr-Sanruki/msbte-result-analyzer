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
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">MSBTE Result Manager</h1>
          <p className="mt-2 text-slate-600">Create your teacher account</p>
        </div>

        <Card>
          <CardHeader>
            <div className="text-lg font-semibold text-slate-900">Register</div>
            <div className="text-sm text-slate-600">Teacher role only</div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <Input placeholder="Your name" {...register("name")} />
                {errors.name?.message ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input type="email" placeholder="teacher@example.com" {...register("email")} />
                {errors.email?.message ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input type="password" placeholder="Minimum 6 characters" {...register("password")} />
                {errors.password?.message ? (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                <Input type="password" placeholder="Re-enter password" {...register("confirmPassword")} />
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

        <div className="mt-8 text-center">
          <Link className="text-sm text-slate-600 hover:underline" href="/">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
