import type { Metadata } from "next";
import { NewGroupJarForm } from "@/components/jars/NewGroupJarForm";

export const metadata: Metadata = {
  title: "New group jar — Orjar",
};

export default function NewGroupJarPage() {
  return (
    <>
      <p className="text-xs uppercase tracking-widest text-white/30">Create</p>
      <h1 className="mt-2 text-2xl font-medium text-foreground">New group savings jar</h1>
      <NewGroupJarForm />
    </>
  );
}
