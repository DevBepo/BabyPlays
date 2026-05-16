import { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";


export function Table({ className = "", children, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-200 shadow-sm bg-white">
      <table className={`w-full text-sm text-left text-zinc-600 ${className}`} {...rest}>
        {children}
      </table>
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
    <th className={`px-6 py-4 font-semibold tracking-wide ${className}`} {...rest}>
      {children}
    </th>
  );
}

// A Célula de Dados (Td)
export function Td({ className = "", children, ...rest }: TdHTMLAttributes<HTMLTableDataCellElement>) {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-zinc-800 ${className}`} {...rest}>
      {children}
    </td>
  );
}