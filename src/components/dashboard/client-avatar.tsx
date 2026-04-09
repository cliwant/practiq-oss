"use client";

import type { ClientWorkspace } from "@/data/mock-data";

/**
 * ClientAvatar — professional client identifier
 * Shows a small colored square with the client's shortName initials.
 * Replaces the previous emoji-based industry icons.
 */
export function ClientAvatar({
  client,
  size = "md",
}: {
  client: ClientWorkspace;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "w-5 h-5 text-[10px] rounded",
    md: "w-7 h-7 text-xs rounded-md",
    lg: "w-9 h-9 text-sm rounded-lg",
  }[size];

  return (
    <div
      className={`${sizeClass} flex items-center justify-center font-semibold text-zinc-100 shrink-0`}
      style={{
        backgroundColor: client.color + "26",
        color: client.color,
      }}
    >
      {client.shortName}
    </div>
  );
}
