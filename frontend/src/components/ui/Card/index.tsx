import { HtmlHTMLAttributes, ReactNode } from "react";

// Tipagem das propriedades
interface CardProps extends HtmlHTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  padding = "md",
  className = "",
  ...rest
}: CardProps) {
  // Controle do preenchimento interno do card
  const paddings = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col overflow-hidden ${paddings[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
