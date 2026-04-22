import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <Image
      src="/Orjar-logo.svg"
      alt="Orjar"
      width={128}
      height={28}
      className={cn("h-7 w-auto", className)}
      priority
    />
  );
}
