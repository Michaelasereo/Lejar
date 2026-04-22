import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Orjar",
  description: "Sign in to Orjar.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
