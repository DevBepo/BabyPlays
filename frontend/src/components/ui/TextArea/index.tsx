import { TextareaHTMLAttributes, useId } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  id,
  className = "",
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || rest.name || generatedId;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}
      
      <textarea
        id={textareaId}
        className={`
          w-full px-4 py-3 bg-white border rounded-lg text-zinc-950 text-base
          transition-all outline-none placeholder:text-zinc-400 min-h-[120px] resize-y
          ${error 
            ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
            : "border-zinc-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          }
          ${className}
        `}
        {...rest}
      />
      
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}