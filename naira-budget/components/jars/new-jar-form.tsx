"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createJarSchema } from "@/lib/validations/jar";
import type { z } from "zod";
import { LoadingButton } from "@/components/ui/LoadingButton";

const schema = createJarSchema;
type FormValues = z.infer<typeof schema>;

const CATEGORY_OPTIONS = [
  { value: "RENT" as const, label: "rent" },
  { value: "EMERGENCY_FUND" as const, label: "emergency fund" },
  { value: "GADGET" as const, label: "gadget" },
  { value: "TRAVEL" as const, label: "travel" },
  { value: "EDUCATION" as const, label: "education" },
  { value: "INVESTMENT_CAPITAL" as const, label: "investment capital" },
  { value: "BUSINESS" as const, label: "business" },
  { value: "CELEBRATION" as const, label: "celebration" },
  { value: "OTHER" as const, label: "other" },
];

export function NewJarForm() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      emoji: "🏦",
      targetAmount: 100000,
      monthlyTarget: null,
      dueDate: undefined,
      color: "#7C63FD",
      category: "OTHER",
      notes: "",
      isPinned: false,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/savings-jars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          dueDate: values.dueDate === "" ? null : values.dueDate ?? null,
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "failed");
      toast.success("Jar created");
      router.push(`/app/jars/${json.id}`);
      router.refresh();
    } catch {
      toast.error("Could not create jar.");
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto mt-10 max-w-md space-y-5 border border-white/10 bg-[#111111] p-6"
    >
      <label className="block text-sm text-white/60">
        Name
        <input
          {...form.register("name")}
          className="mt-2 min-h-11 w-full border border-white/15 bg-black px-3 text-foreground"
          autoComplete="off"
        />
      </label>
      <label className="block text-sm text-white/60">
        Emoji
        <input
          {...form.register("emoji")}
          className="mt-2 min-h-11 w-full border border-white/15 bg-black px-3 text-foreground"
        />
      </label>
      <label className="block text-sm text-white/60">
        Target amount (₦)
        <input
          type="number"
          step="1"
          {...form.register("targetAmount", { valueAsNumber: true })}
          className="mt-2 min-h-11 w-full border border-white/15 bg-black px-3 text-foreground tabular-nums"
        />
      </label>
      <label className="block text-sm text-white/60">
        Monthly savings target (optional)
        <input
          type="number"
          step="1"
          {...form.register("monthlyTarget", {
            setValueAs: (v) =>
              v === "" || v === undefined ? null : Number(v),
          })}
          className="mt-2 min-h-11 w-full border border-white/15 bg-black px-3 text-foreground tabular-nums"
        />
      </label>
      <label className="block text-sm text-white/60">
        Deadline (optional)
        <input
          type="datetime-local"
          {...form.register("dueDate")}
          className="mt-2 min-h-11 w-full border border-white/15 bg-black px-3 text-foreground"
        />
      </label>
      <label className="block text-sm text-white/60">
        Color
        <input
          type="color"
          {...form.register("color")}
          className="mt-2 h-11 w-full border border-white/15 bg-black"
        />
      </label>
      <label className="block text-sm text-white/60">
        Category
        <select
          {...form.register("category")}
          className="mt-2 min-h-11 w-full border border-white/15 bg-black px-3 text-foreground"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-3 text-sm text-white/60">
        <input type="checkbox" {...form.register("isPinned")} className="h-4 w-4" />
        Pin to Home dashboard
      </label>
      <label className="block text-sm text-white/60">
        Notes
        <textarea
          {...form.register("notes")}
          rows={3}
          className="mt-2 w-full border border-white/15 bg-black px-3 py-2 text-foreground"
        />
      </label>

      <LoadingButton
        type="submit"
        state={form.formState.isSubmitting ? "loading" : "idle"}
        loadingText="Creating..."
        successText="Jar created"
        className="w-full"
      >
        Create jar
      </LoadingButton>
    </form>
  );
}
