import { InputHTMLAttributes, useId } from "react";

// Tipagem das propriedades
interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ 
  label, 
  id, 
  className = "", 
  ...rest 
}: CheckboxProps) {
  // ID único para garantir que o clique no texto marque a caixa 
  const generatedId = useId();
  const checkboxId = id || rest.name || generatedId;

  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id={checkboxId}
        className={`
          w-5 h-5 rounded border-zinc-300 text-teal-600 
          focus:ring-2 focus:ring-teal-600 focus:ring-offset-1
          accent-teal-600 cursor-pointer transition-all
          ${className}
        `}
        {...rest}
      />
      
      {/* O select-none evita que o texto fique "azul" e selecionado se o usuário clicar várias vezes rápido, não fica quela coisa feia */}
      {label && (
        <label 
          htmlFor={checkboxId} 
          className="text-sm font-medium text-zinc-700 cursor-pointer select-none"
        >
          {label}
        </label>
      )}
    </div>
  );
}