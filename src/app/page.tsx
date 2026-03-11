"use client";

import { PageHeader } from "@/components/layout/page-header";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="FinanceKJ" showMonthNav />
      <div className="p-4">
        <p className="text-center text-sm text-muted-foreground">
          Dashboard en construcción...
        </p>
      </div>
    </div>
  );
}
