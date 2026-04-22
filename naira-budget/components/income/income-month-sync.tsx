"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export function IncomeMonthSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedMonth = useAppStore((s) => s.selectedMonth);

  useEffect(() => {
    if (pathname !== "/app/income") return;
    const current = searchParams.get("month");
    if (current === selectedMonth) return;
    const q = new URLSearchParams(searchParams.toString());
    q.set("month", selectedMonth);
    router.replace(`${pathname}?${q.toString()}`);
  }, [pathname, router, searchParams, selectedMonth]);

  return null;
}
