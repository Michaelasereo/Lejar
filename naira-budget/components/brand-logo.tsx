import { cn } from "@/lib/utils/cn";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/Orjar-logo.svg"
      alt="Orjar"
      className={cn("h-7 w-auto object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}
