import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: "default" | "accent" | "metric";
  hover?: boolean;
  glow?: "emerald" | "blue" | "amber" | "orange" | "rose" | "none";
  padding?: "none" | "sm" | "md" | "lg";
}

export function GlassCard({
  children,
  className,
  style,
  variant = "default",
  hover = true,
  glow = "none",
  padding = "md",
}: GlassCardProps) {
  const glowClasses: Record<string, string> = {
    emerald: "glow-emerald",
    blue: "glow-blue",
    amber: "glow-amber",
    orange: "glow-orange",
    rose: "glow-rose",
    none: "",
  };

  const paddingClasses: Record<string, string> = {
    none: "p-0",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <div
      style={style}
      className={cn(
        "rounded-2xl transition-all duration-300",
        variant === "default" && "glass-card",
        variant === "accent" && "glass-card-accent",
        variant === "metric" && "glass-card",
        hover && "hover:transform hover:-translate-y-0.5",
        glowClasses[glow],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
