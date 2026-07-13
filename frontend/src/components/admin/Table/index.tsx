import { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";


export function Table({ className = "", children, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full min-w-0">
      <p className="mb-2 text-xs font-medium text-zinc-500 md:hidden">
        Deslize a tabela para o lado para ver todas as informações.
      </p>
      <div
        role="region"
        aria-label="Tabela com rolagem horizontal"
        tabIndex={0}
        className="w-full overflow-x-auto overscroll-x-contain rounded-xl border border-zinc-200 bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
      >
        <table className={`w-full min-w-[680px] text-left text-sm text-zinc-600 md:min-w-full ${className}`} {...rest}>
          {children}
        </table>
      </div>
    </div>
  );
}

// O Cabeçalho (Thead)
export function Thead({ className = "", children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`text-xs text-zinc-500 uppercase bg-zinc-50/80 border-b border-zinc-200 ${className}`} {...rest}>
      {children}
    </thead>
  );
}

// O Corpo da Tabela (Tbody)
export function Tbody({ className = "", children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-zinc-200 ${className}`} {...rest}>
      {children}
    </tbody>
  );
}

// A Linha (Tr)
export function Tr({ className = "", children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`hover:bg-zinc-50/80 transition-colors group ${className}`} {...rest}>
      {children}
    </tr>
  );
}

// A Célula de Cabeçalho (Th)
export function Th({ className = "", children, ...rest }: ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return (
    <th className={`px-4 py-3 font-semibold tracking-wide md:px-6 md:py-4 ${className}`} {...rest}>
      {children}
    </th>
  );
}

// A Célula de Dados (Td)
export function Td({ className = "", children, ...rest }: TdHTMLAttributes<HTMLTableDataCellElement>) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-zinc-800 md:px-6 md:py-4 ${className}`} {...rest}>
      {children}
    </td>
  );
}
