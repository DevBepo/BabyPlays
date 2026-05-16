import { HTMLAttributes, ReactNode } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>{
  children: ReactNode;
  variant?: "success" | "warning" | "default" | "brand";
}

export function Badge ({
  children,
  variant = "success",
  className = "",
  ...rest
}: BadgeProps){

  // Classes base da etiqueta
  const baseStyles = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide";
  
  const variants = {
    success: "bg-[#E6F4EA] text-[#1E7E34]", // O verde claro de "Disponível"
    warning: "bg-amber-100 text-amber-800", // Para algo como "Última unidade"
    default: "bg-zinc-100 text-zinc-600", // Para tags genéricas
    brand: "bg-teal-50 text-teal-700", // Usando a cor da marca
  }

  return(
    <span className={`${baseStyles} ${variants[variant]} ${className}`}{...rest}>
      {children}
    </span>
  )

}