"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

const VIACEP_BASE_URL = "https://viacep.com.br/ws/";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

function normalizarCep(cep: string) {
  return cep.replace(/[.\-\s]/g, "");
}

export default function EntregasConfigPage() {
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepSuccess, setCepSuccess] = useState<string | null>(null);

  // Mock dos dados atuais que viriam de um GET /api/taxa-entrega-retirada/configuracao/
  const [config, setConfig] = useState({
    cep: "92700-000",
    logradouro: "Rua São José",
    numero: "150",
    bairro: "Centro",
    cidade: "Guaíba",
    estado: "RS",
    valorPorKm: 1.50,
    ativo: true,
  });

  const handleBuscarCep = async () => {
    const cep = normalizarCep(config.cep);

    setCepError(null);
    setCepSuccess(null);

    if (!/^\d{8}$/.test(cep)) {
      setCepError("CEP invalido. Informe exatamente 8 digitos.");
      return;
    }

    setCepLoading(true);

    try {
      const response = await fetch(`${VIACEP_BASE_URL}${cep}/json/`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        setCepError("Servico externo de CEP indisponivel. Tente novamente em instantes.");
        return;
      }

      const data = (await response.json()) as ViaCepResponse;

      if (data.erro) {
        setCepError("CEP nao encontrado. Confira os numeros informados.");
        return;
      }

      setConfig((currentConfig) => ({
        ...currentConfig,
        cep,
        logradouro: data.logradouro?.trim() ?? "",
        bairro: data.bairro?.trim() ?? "",
        cidade: data.localidade?.trim() ?? "",
        estado: data.uf?.trim().toUpperCase() ?? "",
      }));
      setCepSuccess("CEP encontrado e endereco preenchido.");
    } catch {
      setCepError("Erro de rede ao buscar CEP. Verifique sua conexao e tente novamente.");
    } finally {
      setCepLoading(false);
    }
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    
    setTimeout(() => {
      setLoading(false);
      alert("Configurações de logística atualizadas com sucesso!");
    }, 1000);
  };

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Configuração de Entregas</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Defina o endereço base da loja e o valor cobrado por quilómetro rodado.
        </p>
      </div>

      <form onSubmit={handleSalvar} className="flex flex-col gap-6">
        
        {/* Card 1: Endereço Base */}
        <Card padding="lg">
          <h2 className="text-lg font-bold text-zinc-800 mb-4 pb-2 border-b border-zinc-100">
            Endereço de Origem (Estoque)
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Este endereço é utilizado pela API do Google Routes para calcular a distância exata até à casa do cliente.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <Input 
                label="CEP *" 
                value={config.cep}
                onChange={(e) => {
                  setCepError(null);
                  setCepSuccess(null);
                  setConfig({...config, cep: e.target.value});
                }}
                error={cepError ?? undefined}
                required 
              />
            </div>
            <div className="md:col-span-8 flex items-end">
              <Button
                type="button"
                variant="secondary"
                className="w-full md:w-auto"
                loading={cepLoading}
                onClick={handleBuscarCep}
              >
                {cepLoading ? "Buscando..." : "Buscar CEP"}
              </Button>
            </div>
            {cepSuccess && (
              <p className="md:col-span-12 text-sm font-medium text-teal-700">
                {cepSuccess}
              </p>
            )}

            <div className="md:col-span-9">
              <Input 
                label="Logradouro (Rua, Avenida) *" 
                value={config.logradouro}
                onChange={(e) => setConfig({...config, logradouro: e.target.value})}
                required 
              />
            </div>
            <div className="md:col-span-3">
              <Input 
                label="Número *" 
                value={config.numero}
                onChange={(e) => setConfig({...config, numero: e.target.value})}
                required 
              />
            </div>

            <div className="md:col-span-4">
              <Input 
                label="Bairro *" 
                value={config.bairro}
                onChange={(e) => setConfig({...config, bairro: e.target.value})}
                required 
              />
            </div>
            <div className="md:col-span-6">
              <Input 
                label="Cidade *" 
                value={config.cidade}
                onChange={(e) => setConfig({...config, cidade: e.target.value})}
                required 
              />
            </div>
            <div className="md:col-span-2">
              <Input 
                label="UF *" 
                value={config.estado}
                onChange={(e) => setConfig({...config, estado: e.target.value})}
                required 
              />
            </div>
          </div>
        </Card>

        {/* Card 2: Precificação Logística */}
        <Card padding="lg">
          <h2 className="text-lg font-bold text-zinc-800 mb-4 pb-2 border-b border-zinc-100">
            Precificação do Frete
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input 
                label="Valor cobrado por KM rodado (R$) *" 
                type="number"
                step="0.01"
                value={config.valorPorKm}
                onChange={(e) => setConfig({...config, valorPorKm: parseFloat(e.target.value)})}
                required 
              />
              <p className="text-xs text-zinc-500 mt-2">
                O sistema calcula a distância de ida e volta e multiplica por este valor. Ex: Se a distância for 10km, o cálculo é (10km ida + 10km volta) * R$ 1,50 = R$ 30,00 de taxa.
              </p>
            </div>
            
            <div className="flex flex-col justify-center bg-zinc-50 p-4 rounded-lg border border-zinc-200">
              <Checkbox 
                label="Habilitar Entregas no Site" 
                checked={config.ativo}
                onChange={(e) => setConfig({...config, ativo: e.target.checked})}
              />
              <p className="text-xs text-zinc-500 mt-1 pl-8">
                Se desmarcado, os clientes só poderão escolher a opção &quot;Retirar na Loja&quot;.
              </p>
            </div>
          </div>
        </Card>

        {/* Ações */}
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" loading={loading} className="w-full sm:w-auto px-8">
            Salvar Configurações
          </Button>
        </div>

      </form>
    </div>
  );
}
