import { Card } from "@/components/ui/Card";

export default function EntregasConfigPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Configuração de entregas</h1>
        <p className="mt-1 text-sm text-zinc-500">
          O frete é configurado por UF, cidade e bairro.
        </p>
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-bold text-zinc-800">Cadastro real no Django Admin</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Esta tela não simula mais o salvamento. Cadastre e edite as regras em
          <strong> Entregas → Regras de frete por bairro</strong> no Django Admin
          do backend.
        </p>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Deixe a taxa vazia ou informe zero para marcar o frete como “a confirmar”.
          Quando não existir regra ativa para o bairro, a solicitação seguirá como
          “sujeita à análise”.
        </div>
      </Card>
    </div>
  );
}
