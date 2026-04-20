import type { Metadata } from "next";
import { NewJarForm } from "@/components/jars/new-jar-form";

export const metadata: Metadata = {
  title: "New jar — Naira Budget",
};

export default function NewJarPage() {
  return (
    <>
      <p className="text-xs uppercase tracking-widest text-white/30">Create</p>
      <h1 className="mt-2 text-2xl font-medium text-foreground">New savings jar</h1>
      <NewJarForm />
    </>
  );
}
