import * as React from "react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

type StatCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "blue" | "green" | "purple" | "orange";
};

const tones: Record<NonNullable<StatCardProps["tone"]>, { card: string; icon: string }> = {
  blue: {
    card: "bg-gradient-to-br from-blue-50 to-white",
    icon: "bg-blue-100 text-blue-700",
  },
  green: {
    card: "bg-gradient-to-br from-emerald-50 to-white",
    icon: "bg-emerald-100 text-emerald-700",
  },
  purple: {
    card: "bg-gradient-to-br from-violet-50 to-white",
    icon: "bg-violet-100 text-violet-700",
  },
  orange: {
    card: "bg-gradient-to-br from-amber-50 to-white",
    icon: "bg-amber-100 text-amber-700",
  },
};

export function StatCard({ label, value, hint, icon, tone = "blue" }: StatCardProps) {
  const t = tones[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -2 }}
    >
      <Card className={t.card}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-600">{label}</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
              {hint ? <div className="mt-1 text-xs text-slate-600">{hint}</div> : null}
            </div>
            {icon ? (
              <div className={"flex h-10 w-10 items-center justify-center rounded-2xl " + t.icon}>{icon}</div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-0" />
      </Card>
    </motion.div>
  );
}
