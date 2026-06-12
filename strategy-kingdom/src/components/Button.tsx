// Shared button with sfx wired in (so call sites don't each remember to chirp).
import type { ReactNode } from "react";
import { sfx } from "../lib/sfx";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  big?: boolean;
  sound?: "tap" | "select" | "none";
  ariaLabel?: string;
  className?: string;
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  big,
  sound = "tap",
  ariaLabel,
  className = "",
}: Props) {
  const cls = [
    "btn",
    variant === "secondary" ? "secondary" : "",
    variant === "ghost" ? "ghost" : "",
    big ? "big" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      className={cls}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={() => {
        if (disabled) return;
        if (sound === "tap") sfx.tap();
        else if (sound === "select") sfx.select();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}
