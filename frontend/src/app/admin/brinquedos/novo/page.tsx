"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/TextArea";
import { criarBrinquedo, uploadImagemBrinquedo } from "@/services/catalogo";

export default function NovoBrinquedo() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState("1");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  
  // NOVO ESTADO: Guardar o arquivo de imagem
  const [imagem, setImagem] = useState<File | null>(null);

  const categoriasOptions = [
    { value: "1", label: "Montar & Construir" },
    { value: "2", label: "Educativos" },
    { value: "3", label: "Faz de Conta" },
    { value: "4", label: "Primeira Infancia" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    try {
      // 1. Cria o brinquedo (dados de texto)
      const novoBrinquedo = await criarBrinquedo({
        nome,
        descricao,
        categoria: parseInt(categoriaId),
        preco_aluguel: preco,
        ativo,
      });

      // 2. Se a cliente escolheu uma imagem, fazemos o upload logo a seguir!
      if (imagem && novoBrinquedo.id) {
        await uploadImagemBrinquedo(novoBrinquedo.id, imagem);
      }

      alert("Brinquedo e imagem criados com sucesso!");
      router.push("/admin/brinquedos");
      
    } catch (err: any) {
      console.error("Erro:", err);
      setErro("Ocorreu um erro ao salvar o brinquedo ou a imagem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Novo brinquedo</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Preencha os dados abaixo e anexe uma foto principal.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
      </div>

      {erro && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">{erro}</div>
      )}

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          
          {/* SECÇÃO DA IMAGEM */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4 pb-2 border-b border-zinc-100">
              Foto Principal
            </h2>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-zinc-300 border-dashed rounded-lg cursor-pointer bg-zinc-50 hover:bg-zinc-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-zinc-500">
                  <svg className="w-8 h-8 mb-4 text-zinc-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                  <p className="mb-2 text-sm"><span className="font-semibold">Clique para anexar</span> a imagem do brinquedo</p>
                  {imagem && <p className="text-teal-600 font-bold mt-2">Arquivo selecionado: {imagem.name}</p>}
                </div>
                <input 
                  id="dropzone-file" 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => setImagem(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          {/* DADOS DO BRINQUEDO */}
          <div>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4 pb-2 border-b border-zinc-100">
              Dados do brinquedo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Input label="Nome *" placeholder="Ex: Cadeira de Balanco Fisher Price" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <Select label="Categoria" options={categoriasOptions} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} />
              <Input label="Preço de aluguel (R$) *" type="number" step="0.01" min="0" placeholder="0.00" value={preco} onChange={(e) => setPreco(e.target.value)} required />
            </div>
          </div>

          <div>
            <Textarea label="Descrição completa *" placeholder="Descreva as características do brinquedo..." value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </div>

          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100">
            <Checkbox label="Ativo no catálogo" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-100 mt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" variant="primary" loading={loading}>Guardar brinquedo</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}