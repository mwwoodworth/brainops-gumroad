"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import clsx from "clsx";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, 'ref'> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "default";
  size?: "sm" | "md" | "lg";
}

const base =
  "inline-flex items-center justify-center rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition min-h-[48px] shadow-[0px_8px_32px_rgba(0,0,0,0.1)] hover:shadow-lg animate-ripple";
const variants = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[color-mix(in_srgb,var(--color-primary)_90%,white)]",
  secondary:
    "border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white",
  outline:
    "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
  ghost:
    "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
  default:
    "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
};
const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}, ref) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.05, boxShadow: "0 0 16px var(--color-primary)" }}
      whileTap={{ scale: 0.95 }}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
});
