"use client"

import { useState } from "react"
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/TextArea"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { Checkbox } from "@/components/ui/Checkbox"

export default function NovoBrinquedo(){
  const router = useRouter();
  const [loading, setLoading] = useState(false)

  //Exemplos de categoriias só para teste...
  const categoriasOptions = [
    { value: "1", label: "Montar & Construir" },
    { value: "2", label: "Educativos" },
    { value: "3", label: "Faz de Conta" },
    { value: "4", label: "Primeira Infância" },
  ];

  // Exemplo de faixas etárias
  const faixasEtariasOptions = [
    { value: "0-6m", label: "0 a 6 meses" },
    { value: "6-12m", label: "6 a 12 meses" },
    { value: "1-2a", label: "1 a 2 anos" },
    { value: "3-5a", label: "3 a 5 anos" },
  ];

  const handleSubmit = async (e: React.FormEvent) =>{
    e.preventDefault();
    setLoading(true);

    //ENTRADA PARA A CONEXÃO COM A API
    // POST /api/catalogo/brinquedos/ utilizando o BrinquedoSerializer
    console.log("Enviando os dados para a API...");
    setTimeout(() => {
      setLoading(false);
      // Redireciona de volta para a lista após sucesso
      router.push("/admin/brinquedos");
    }, 1500);

  };
  
  return (
    <div className="max-w-4xl">
      {/* Cabeçalho da Página */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Novo Brinquedo</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Preencha os dados abaixo para registar um novo brinquedo no catálogo.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>

      {/* Formulário Principal (Envolvido no nosso Card) */}
      <Card padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          
          {/* Secção 1: Informações Básicas */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4 pb-2 border-b border-zinc-100">
              Informações Básicas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input 
                  label="Nome do Brinquedo *" 
                  placeholder="Ex: Cadeira de Balanço Fisher Price" 
                  required 
                />
              </div>
              
              <Select 
                label="Categoria *" 
                options={categoriasOptions} 
                required 
              />
              
              <Select 
                label="Faixa Etária Recomendada *" 
                options={faixasEtariasOptions} 
                required 
              />
            </div>
          </div>

          {/* Secção 2: Detalhes e Valores */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4 pb-2 border-b border-zinc-100">
              Detalhes Financeiros
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Valor de Compra (R$) *" 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                required 
              />
              
              <Input 
                label="Valor de Reposição (R$) *" 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                required 
              />
            </div>
          </div>

          {/* Secção 3: Descrições (Usando o Textarea) */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4 pb-2 border-b border-zinc-100">
              Apresentação no Site
            </h2>
            <div className="flex flex-col gap-6">
              <Input 
                label="Breve Descrição (Subtítulo)" 
                placeholder="Uma frase curta para chamar a atenção..." 
              />
              
              <Textarea 
                label="Descrição Completa" 
                placeholder="Descreva as características, benefícios e dimensões do brinquedo..." 
              />
            </div>
          </div>

          {/* Secção 4: Configurações de Estado */}
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
            <Checkbox 
              label="Brinquedo Ativo na Loja" 
              defaultChecked 
            />
            <p className="text-xs text-zinc-500 mt-1 pl-8">
              Se desmarcado, o brinquedo não aparecerá na vitrina para os clientes, mesmo que haja stock.
            </p>
          </div>

          {/* Ações do Formulário */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-100 mt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Guardar Brinquedo
            </Button>
          </div>
          
        </form>
      </Card>
    </div>
  );

}