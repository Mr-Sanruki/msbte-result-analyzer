import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, backHref, backLabel = "Back", actions }: PageHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-5">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {backHref ? (
            <Link href={backHref}>
              <Button variant="secondary">{backLabel}</Button>
            </Link>
          ) : null}
          {actions}
        </div>
      </div>
    </header>
  );
}
