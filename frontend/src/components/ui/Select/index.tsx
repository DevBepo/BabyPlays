import { SelectHTMLAttributes, useId } from "react";

// Tipamos as opções que o Select vai receber (ex: { value: 1, label: "Montar & Construir" })
export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  options,
  placeholder = "Selecione uma opção...",
  id,
  className = "",
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id || rest.name || generatedId;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full px-4 py-2.5 bg-white border rounded-lg text-zinc-950 text-base
            transition-all outline-none appearance-none cursor-pointer
            ${error 
              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
              : "border-zinc-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            }
            ${className}
          `}
          {...rest}
        >
          {/* Opção vazia / Placeholder */}
          <option value="" disabled>{placeholder}</option>
          
          {/* Renderiza as opções vindas da API (Django) */}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Ícone de seta customizado para esconder o padrão feio do navegador */}
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </div>
      
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}