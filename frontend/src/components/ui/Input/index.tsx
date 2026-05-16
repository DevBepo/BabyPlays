import { InputHTMLAttributes, useId } from "react";

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
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id || rest.name || generatedId;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/*Exibe a label se for passada por parâmetro*/}
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}

      {/*Campo do Input*/}
      <input
        id={inputId}
        className={`
          w-full px-4 py-2.5 bg-white border rounded-lg text-zinc-950 text-base
          transition-all outline-none placeholder:text-zinc-400
          ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-zinc-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          }
          ${className}
        `}
        {...rest}
      />

      {/*Mensagem de erro*/}
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
