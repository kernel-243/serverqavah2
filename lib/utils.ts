import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date-only value (e.g. birthday) without timezone shift.
 * MongoDB stores dates as UTC; using local time can show the previous day.
 * This uses UTC date parts so the displayed date matches the stored calendar date.
 */
export function formatDateOnly(value: string | Date | null | undefined): string {
  if (value == null || value === "") return ""
  const d = typeof value === "string" ? new Date(value) : value
  if (isNaN(d.getTime())) return ""
  const day = d.getUTCDate()
  const month = d.getUTCMonth() + 1
  const year = d.getUTCFullYear()
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
}

