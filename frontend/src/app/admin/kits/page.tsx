"use client";

import { useRouter } from "next/navigation";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

// Dados simulados misturando KitFesta (Fixos) e ConfiguracaoKitPersonalizavel (Personalizáveis)
const mockKits = [
  {
    id: "K-001",
    nome: "Kit Festa Dinossauros",
    tipo: "FIXO",
    itensDescricao: "Piscina de Bolinhas, Escorregador Dino, Gangorra",
    preco: 250.00,
    ativo: true,
  },
  {
    id: "K-002",
    nome: "Kit Primeira Infância",
    tipo: "FIXO",
    itensDescricao: "Tapete de Atividades, Cubo Didático, Andador",
    preco: 120.00,
    ativo: true,
  },
  {
    id: "P-001",
    nome: "Monte seu Kit (3 Brinquedos)",
    tipo: "PERSONALIZAVEL",
    itensDescricao: "Cliente escolhe 3 itens da categoria 'Educativos'",
    preco: 150.00, // No personalizável este é o preco_base
    ativo: true,
  },
  {
    id: "P-002",
    nome: "Mega Combo (5 Brinquedos Grandes)",
    tipo: "PERSONALIZAVEL",
    itensDescricao: "Cliente escolhe até 5 itens grandes",
    preco: 450.00,
    ativo: false,
  },
];

export default function GestaoKitsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      
      {/* Cabeçalho da Página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestão de Kits e Combos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gira os pacotes fechados e as regras de kits personalizáveis.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => alert("Modal para Kit Personalizável em breve!")}>
            + Regra Personalizável
          </Button>
          <Button variant="primary" onClick={() => alert("Formulário de Kit Fixo em breve!")}>
            + Novo Kit Fixo
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row gap-4 items-end shadow-sm">
        <div className="flex-1 w-full">
          <Input 
            placeholder="Buscar por nome do kit..." 
            className="h-10"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select 
            options={[
              { value: "todos", label: "Todos os tipos" },
              { value: "fixo", label: "Apenas Kits Fixos" },
              { value: "personalizavel", label: "Kits Personalizáveis" },
            ]} 
            className="h-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            options={[
              { value: "todos", label: "Todos os status" },
              { value: "ativos", label: "Apenas Ativos" },
              { value: "inativos", label: "Apenas Inativos" },
            ]} 
            className="h-10"
          />
        </div>
      </div>

      {/* Tabela de Kits */}
      <Table>
        <Thead>
          <Tr>
            <Th>Nome do Pacote</Th>
            <Th>Tipo de Kit</Th>
            <Th>Preço (Base)</Th>
            <Th>Status no Site</Th>
            <Th className="text-right">Ações</Th>
          </Tr>
        </Thead>
        <Tbody>
          {mockKits.map((kit) => (
            <Tr key={kit.id}>
              
              {/* Nome e Descrição Breve */}
              <Td>
                <div className="flex flex-col">
                  <span className="font-semibold text-zinc-900">{kit.nome}</span>
                  <span className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs" title={kit.itensDescricao}>
                    {kit.itensDescricao}
                  </span>
                </div>
              </Td>

              {/* Tipo (Fixo ou Personalizável) */}
              <Td>
                {kit.tipo === "FIXO" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    Pronto
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    Personalizável
                  </span>
                )}
              </Td>

              {/* Preço Base */}
              <Td className="font-medium text-zinc-900">
                R$ {kit.preco.toFixed(2).replace('.', ',')}
              </Td>

              {/* Status no Site */}
              <Td>
                {kit.ativo ? (
                  <Badge variant="success">Ativo</Badge>
                ) : (
                  <Badge variant="default">Inativo</Badge>
                )}
              </Td>

              {/* Ações */}
              <Td className="text-right">
                <Button variant="ghost" size="sm">
                  Configurar
                </Button>
              </Td>

            </Tr>
          ))}
        </Tbody>
      </Table>
      
    </div>
  );
}