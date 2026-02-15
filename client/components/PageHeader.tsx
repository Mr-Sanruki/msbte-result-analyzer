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
    <header className="top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-5">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>

        <div className="shrink-0">
          <div className="flex max-w-[60vw] items-center justify-end gap-2 overflow-x-auto whitespace-nowrap pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {backHref ? (
              <Link href={backHref} className="shrink-0">
                <Button variant="secondary" size="sm">
                  {backLabel}
                </Button>
              </Link>
            ) : null}
            <div className="shrink-0">{actions}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
