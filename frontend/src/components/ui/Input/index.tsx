"use client";

import { InputHTMLAttributes, useId, useState } from "react";

// Ícone para caso o input sejha do tipo 'password'
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

// Tipagem das propriedades
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  id,
  className = "",
  type, 
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id || rest.name || generatedId;
  
  // Estado que controla se a senha está visível
  const [showPassword, setShowPassword] = useState(false);

  // Verificações lógicas
  const isPasswordField = type === "password";
  // Se for campo de senha E o utilizador clicou no olho, vira texto. Senão, mantém o type original.
  const inputType = isPasswordField && showPassword ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Exibe a label se for passada por parâmetro */}
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}

      {/* Wrapper relativo para segurar o ícone */}
      <div className="relative">
        {/* Campo do Input */}
        <input
          id={inputId}
          type={inputType}
          className={`
            w-full px-4 py-2.5 bg-white border rounded-lg text-zinc-950 text-base
            transition-all outline-none placeholder:text-zinc-400
            ${isPasswordField ? "pr-12" : ""} 
            ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-zinc-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            }
            ${className}
          `}
          {...rest}
        />

        {/* Botão do Olho (Só aparece se o type original for 'password') */}
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-teal-600 transition-colors p-1"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {/* Mensagem de erro */}
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}