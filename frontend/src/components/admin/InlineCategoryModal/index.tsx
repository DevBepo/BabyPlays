"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/TextArea";
import { criarCategoria } from "@/services/catalogo";
import type { ApiError, ApiFieldErrors } from "@/types/api";
import type { CategoriaCatalogo } from "@/types/catalogo";

type InlineCategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (categoria: CategoriaCatalogo) => void;
};

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

function erroCampo(fieldErrors: ApiFieldErrors | undefined, campo: string) {
  return fieldErrors?.[campo]?.join(" ");
}

function gerarSlug(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function InlineCategoryModal({
  isOpen,
  onClose,
  onCreated,
}: InlineCategoryModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors | undefined>();
  const [salvando, setSalvando] = useState(false);

  function resetar() {
    setNome("");
    setDescricao("");
    setErro(null);
    setFieldErrors(undefined);
  }

  function fechar() {
    if (salvando) return;
    resetar();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("Informe o nome da categoria.");
      return;
    }

    setSalvando(true);
    setErro(null);
    setFieldErrors(undefined);

    try {
      const categoria = await criarCategoria({
        nome: nomeLimpo,
        slug: gerarSlug(nomeLimpo),
        descricao: descricao.trim(),
        ativo: true,
        ordem: 0,
      });
      resetar();
      onCreated(categoria);
      onClose();
    } catch (error) {
      if (isApiError(error)) {
        setErro(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setErro("Nao foi possivel criar a categoria.");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={fechar}
      title="Nova categoria"
      description="Crie a categoria sem sair do formulario atual."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {erro ? (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">
            {erro}
          </div>
        ) : null}

        <Input
          label="Nome *"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          error={erroCampo(fieldErrors, "nome") || erroCampo(fieldErrors, "slug")}
          required
        />
        <Textarea
          label="Descricao"
          rows={3}
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          error={erroCampo(fieldErrors, "descricao")}
        />

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={fechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={salvando}>
            Criar categoria
          </Button>
        </div>
      </form>
    </Modal>
  );
}
