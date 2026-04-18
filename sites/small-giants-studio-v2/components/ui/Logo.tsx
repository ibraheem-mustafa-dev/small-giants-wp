"use client";

import Image from "next/image";
import { useState } from "react";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
}

export function Logo({ className = "h-10 w-auto sm:h-12", variant = "default" }: LogoProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return <LogoText className={className} variant={variant} />;
  }

  // Logo PNG has transparent background
  // Light variant: fully white for use on coloured backgrounds
  const filterClass = variant === "light"
    ? "brightness-0 invert"
    : "";

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/images/sgs-horizontal-logo.png"
        alt="Small Giants Studio — Digital Transformation for UK SMEs"
        width={600}
        height={185}
        className={`h-full w-auto ${filterClass}`}
        priority
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export function LogoText({ className = "", variant = "default" }: LogoProps) {
  return (
    <div className={`flex items-center gap-1.5 text-xl font-bold ${className}`}>
      <span style={{ color: variant === "light" ? "var(--color-ink-on-dark)" : "var(--color-ink-primary)" }}>
        Small Giants
      </span>
      <span style={{ color: "var(--color-accent)" }}>
        Studio
      </span>
    </div>
  );
}
