/**
 * Modal — Componente de diálogo/modal reutilizável.
 *
 * Uso: popups, diálogos de confirmação, formulários em overlay.
 *
 * Props:
 *   - isOpen: boolean — controla visibilidade do modal
 *   - onClose: function — callback ao fechar (click overlay, X, ou Escape)
 *   - title: string — título do modal
 *   - description: string — subtítulo/descrição (opcional)
 *   - size: 'sm' | 'md' | 'lg' (default: 'md') — largura máxima
 *   - children: conteúdo do modal
 *
 * Limitações:
 *   - Não suporta modais empilhados (stacked modals).
 */

"use client"; // Obrigatório no Next.js para componentes que usam hooks e manipulam o DOM

import { useEffect, useRef, useId, ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  children,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement as HTMLElement;

    // Lógica de acessibilidade para prender o "Tab" dentro do modal
    const getFocusableElements = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || []
      );

    const firstElement = getFocusableElements()[0];
    if (firstElement) firstElement.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();

      if (e.key === "Tab") {
        const focusableElements = getFocusableElements();
        if (!focusableElements.length) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    
    // Bloqueia scroll do body
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (previousFocus) previousFocus.focus();
    };
  }, [isOpen, onClose]);

  // Se não estiver aberto ou o DOM ainda não existir, não renderiza nada
  if (!isOpen || typeof document === "undefined") return null;

  // Tamanhos do modal
  const sizeClasses = {
    sm: "max-w-[480px]",
    md: "max-w-[640px]",
    lg: "max-w-[900px]",
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()} // Evita fechar o modal ao clicar dentro dele
        className={`relative w-full ${sizeClasses[size]} max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200`}
      >
        <button
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <IconClose />
        </button>

        {(title || description) && (
          <div className="mb-6 pr-8">
            {title && <h2 id={titleId} className="text-xl font-bold text-zinc-900">{title}</h2>}
            {description && <p id={descId} className="mt-1 text-sm text-zinc-500">{description}</p>}
          </div>
        )}

        {children}
      </div>
    </div>,
    document.body
  );
}
