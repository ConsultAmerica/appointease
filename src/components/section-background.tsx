import type { ReactNode } from "react";
import { BACKGROUND_IMAGES } from "@/lib/appointment-images";

export type BackgroundVariant = "clinic" | "calendar" | "scheduling" | "auth";

const VARIANT_CLASS: Record<BackgroundVariant, string> = {
  clinic: "bg-appointment-clinic",
  calendar: "bg-appointment-calendar",
  scheduling: "bg-appointment-scheduling",
  auth: "bg-appointment-auth",
};

export { BACKGROUND_IMAGES };

type SectionBackgroundProps = {
  variant: BackgroundVariant;
  className?: string;
  children: ReactNode;
  as?: "div" | "section" | "main";
};

export function SectionBackground({
  variant,
  className = "",
  children,
  as: Tag = "section",
}: SectionBackgroundProps) {
  return <Tag className={`${VARIANT_CLASS[variant]} ${className}`.trim()}>{children}</Tag>;
}
