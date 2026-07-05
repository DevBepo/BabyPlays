"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  atualizarRegraFreteBairro,
  criarRegraFreteBairro,
  excluirRegraFreteBairro,
  listarRegrasFreteBairro,
} from "@/services/adminEntregas";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { RegraFreteBairro } from "@/types/adminEntregas";

const FORM_INICIAL = {
  uf: "",
  cidade: "",
  bairro: "",
  valorTaxa: "",
  ativo: true,
  observacao: "",
};

const FILTROS_STATUS = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
];

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "message" in error;
}

function erroCampo(fieldErrors: ApiFieldErrors | undefined, campo: string) {
  return fieldErrors?.[campo]?.join(" ");
}

function normalizarBusca(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function formatarValor(valor: string | null) {
  if (!valor || Number(valor) <= 0) {
    return "A confirmar";
  }
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EntregasConfigPage() {
  const [regras, setRegras] = useState<RegraFreteBairro[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [formAberto, setFormAberto] = useState(false);
  const [regraEditando, setRegraEditando] = useState<RegraFreteBairro | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);

  useEffect(() => {
    let active = true;
    async function carregar() {
      try {
        const dados = await listarRegrasFreteBairro();
        if (active) setRegras(dados);
      } catch (error) {
        if (active) setErro(isApiError(error) ? error.message : "Nao foi possivel carregar as regras de frete.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void carregar();
    return () => { active = false; };
  }, []);

  const regrasFiltradas = useMemo(() => {
    const termo = normalizarBusca(busca);
    return regras.filter((regra) => {
      const correspondeBusca = !termo || normalizarBusca(`${regra.cidade} ${regra.bairro} ${regra.uf}`).includes(termo);
      const correspondeStatus = filtroStatus === "todos" || (filtroStatus === "ativos" ? regra.ativo : !regra.ativo);
      return correspondeBusca && correspondeStatus;
    });
  }, [busca, filtroStatus, regras]);

  function abrirNovaRegra() {
    setRegraEditando(null);
    setForm(FORM_INICIAL);
    setFieldErrors(undefined);
    setErro(null);
    setFormAberto(true);
  }

  function editar(regra: RegraFreteBairro) {
    setRegraEditando(regra);
    setForm({
      uf: regra.uf,
      cidade: regra.cidade,
      bairro: regra.bairro,
      valorTaxa: regra.valor_taxa ?? "",
      ativo: regra.ativo,
      observacao: regra.observacao,
    });
    setFieldErrors(undefined);
    setErro(null);
    setFormAberto(true);
  }

  function fecharFormulario() {
    setFormAberto(false);
    setRegraEditando(null);
    setForm(FORM_INICIAL);
    setFieldErrors(undefined);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    setFieldErrors(undefined);
    const payload = {
      uf: form.uf,
      cidade: form.cidade,
      bairro: form.bairro,
      valor_taxa: form.valorTaxa.trim() === "" || Number(form.valorTaxa) === 0 ? null : form.valorTaxa,
      ativo: form.ativo,
      observacao: form.observacao,
    };
    try {
      const salva = regraEditando
        ? await atualizarRegraFreteBairro(regraEditando.id, payload)
        : await criarRegraFreteBairro(payload);
      setRegras((atuais) => regraEditando
        ? atuais.map((item) => item.id === salva.id ? salva : item)
        : [...atuais, salva]);
      setSucesso(regraEditando ? "Regra atualizada com sucesso." : "Regra criada com sucesso.");
      fecharFormulario();
    } catch (error) {
      if (isApiError(error)) {
        setErro(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setErro("Nao foi possivel salvar a regra de frete.");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(regra: RegraFreteBairro) {
    setErro(null);
    setSucesso(null);
    try {
      const atualizada = await atualizarRegraFreteBairro(regra.id, { ativo: !regra.ativo });
      setRegras((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item));
      setSucesso(atualizada.ativo ? "Regra ativada com sucesso." : "Regra desativada com sucesso.");
    } catch (error) {
      setErro(isApiError(error) ? error.message : "Nao foi possivel alterar o status da regra.");
    }
  }

  async function excluir(regra: RegraFreteBairro) {
    if (!window.confirm(`Remover a regra de ${regra.bairro} - ${regra.cidade}/${regra.uf}?`)) return;
    setExcluindoId(regra.id);
    setErro(null);
    setSucesso(null);
    try {
      await excluirRegraFreteBairro(regra.id);
      setRegras((atuais) => atuais.filter((item) => item.id !== regra.id));
      setSucesso("Regra removida com sucesso.");
    } catch (error) {
      setErro(isApiError(error) ? error.message : "Nao foi possivel remover a regra.");
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Frete por bairro</h1>
          <p className="mt-1 text-sm text-zinc-500">Configure valores de entrega e retirada por cidade e bairro.</p>
        </div>
        <Button type="button" onClick={abrirNovaRegra}>Nova regra</Button>
      </div>

      {erro && <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">{erro}</div>}
      {sucesso && <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{sucesso}</div>}

      {formAberto && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">{regraEditando ? "Editar regra" : "Nova regra"}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={fecharFormulario}>Cancelar</Button>
          </div>
          <form onSubmit={salvar} className="mt-5 grid gap-5 md:grid-cols-3">
            <Input label="UF *" value={form.uf} maxLength={2} required onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))} error={erroCampo(fieldErrors, "uf")} />
            <Input label="Cidade *" value={form.cidade} required onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} error={erroCampo(fieldErrors, "cidade")} />
            <Input label="Bairro *" value={form.bairro} required onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} error={erroCampo(fieldErrors, "bairro")} />
            <Input label="Valor da taxa" type="number" min="0" step="0.01" placeholder="A confirmar" value={form.valorTaxa} onChange={(e) => setForm((f) => ({ ...f, valorTaxa: e.target.value }))} error={erroCampo(fieldErrors, "valor_taxa")} />
            <div className="flex items-center pt-7"><Checkbox label="Regra ativa" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} /></div>
            <p className="text-xs text-zinc-500 md:col-span-2">Valor vazio ou zero será salvo como “a confirmar”, nunca como frete grátis.</p>
            <div className="flex justify-end"><Button type="submit" loading={salvando}>{regraEditando ? "Atualizar regra" : "Salvar regra"}</Button></div>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input aria-label="Buscar por cidade ou bairro" placeholder="Buscar por cidade ou bairro" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Select aria-label="Filtrar por status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} options={FILTROS_STATUS} />
        </div>

        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Carregando regras de frete...</div>
        ) : regrasFiltradas.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">{regras.length === 0 ? "Nenhuma regra de frete cadastrada." : "Nenhuma regra encontrada para os filtros informados."}</div>
        ) : (
          <Table>
            <Thead><Tr><Th>Localidade</Th><Th>Taxa</Th><Th>Status</Th><Th>Observacao</Th><Th className="text-right">Acoes</Th></Tr></Thead>
            <Tbody>
              {regrasFiltradas.map((regra) => (
                <Tr key={regra.id}>
                  <Td><div className="flex flex-col"><span className="font-semibold text-zinc-900">{regra.bairro}</span><span className="text-xs text-zinc-500">{regra.cidade}/{regra.uf}</span></div></Td>
                  <Td><div className="flex flex-col"><span className="font-semibold">{formatarValor(regra.valor_taxa)}</span><span className="text-xs text-zinc-400">{regra.status_taxa === "calculada" ? "Valor definido" : "A confirmar"}</span></div></Td>
                  <Td>{regra.ativo ? <Badge variant="success">Ativa</Badge> : <Badge variant="default">Inativa</Badge>}</Td>
                  <Td className="max-w-xs whitespace-normal text-sm text-zinc-600">{regra.observacao || "—"}</Td>
                  <Td className="text-right"><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => editar(regra)}>Editar</Button><Button type="button" size="sm" variant={regra.ativo ? "outline" : "secondary"} onClick={() => void alternarAtivo(regra)}>{regra.ativo ? "Desativar" : "Ativar"}</Button><Button type="button" size="sm" variant="danger" loading={excluindoId === regra.id} onClick={() => void excluir(regra)}>Remover</Button></div></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
