import Link from "next/link";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "white";
  size?: "md" | "lg";
  href?: string;
  external?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary:
    "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-dark)] shadow-sm",
  secondary:
    "bg-[var(--color-surface-dark)] text-[var(--color-ink-on-dark)] hover:bg-[var(--color-surface-dark-alt)] shadow-sm",
  outline:
    "border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5",
  ghost:
    "text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-light-alt)]",
  white:
    "bg-[var(--color-surface-light)] text-[var(--color-surface-dark)] shadow-md hover:shadow-lg",
};

const sizes = {
  md: "px-5 py-2.5 text-sm min-h-[44px]",
  lg: "px-8 py-3 text-base min-h-[48px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      href,
      external = false,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-semibold rounded-[999px] transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

    if (href) {
      if (external) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes}
          >
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
