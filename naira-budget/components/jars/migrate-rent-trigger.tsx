"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MigrateRentTrigger() {
  const router = useRouter();

  async function migrate() {
    try {
      const res = await fetch("/api/savings-jars/migrate-rent-jar", {
        method: "POST",
      });
      const json = (await res.json()) as {
        created?: boolean;
        jarId?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "failed");
      if (json.created) toast.success("Rent jar imported as a savings jar.");
      else toast.message("Rent jar already imported or no legacy rent jar.");
      router.refresh();
    } catch {
      toast.error("Could not migrate rent jar.");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void migrate()}
      className="text-sm font-medium text-accent underline-offset-4 hover:underline"
    >
      Import rent jar
    </button>
  );
}
