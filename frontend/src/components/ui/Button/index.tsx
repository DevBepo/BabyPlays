import { ButtonHTMLAttributes, ReactNode } from "react";

// Tipagem da propriedades

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  // Classe padrão que todos os botões vão compartilhar
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 tracking-wide";

  // Variação de cor dos botões, que pode ser editada depois.
  const variants = {
    primary: "bg-[#FF5A5F] text-white hover:bg-[#E04E53]",
    secondary: "bg-teal-600 text-white hover:bg-teal-700",
    outline:
      "border-2 border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300",
    ghost: "bg-transparent text-teal-600 hover:bg-teal-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  // Variação de tamanho do botão
  const sizes = {
    sm: "px-4 py-2 text-sm gap-1.5",
    md: "px-6 py-3 text-base gap-2",
    lg: "px-8 py-4 text-lg gap-3",
  };

  // Tratamento de estados
  const widthClass = fullWidth ? "w-full" : "";
  const disabledClass =
    disabled || loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${disabledClass} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {/* Spinner de Loading incorporado diretamente com SVG e Tailwind */}
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-5 w-5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
}
