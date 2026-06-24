import Link from "next/link";

import { ContactActions } from "@/components/client/ContactActions";
import { Footer } from "@/components/client/Footer";
import { Header } from "@/components/client/Header";
import { SubNavbar } from "@/components/client/SubNavBar";

const steps = [
  ["1", "Escolha os itens", "Selecione os brinquedos ou kits e o período desejado."],
  ["2", "Envie seu pedido", "Preencha os dados, leia o Termo de Uso e Responsabilidade e envie a solicitação."],
  ["3", "Confirme pelo WhatsApp", "A BabyPlays verifica a disponibilidade e combina as datas exatas, entrega e retirada."],
  ["4", "Receba e aproveite", "Use os brinquedos conforme as orientações e sempre com supervisão de um adulto."],
  ["5", "Hora da devolução", "No fim do período confirmado, deixe os itens prontos para a retirada combinada."],
];

export default function ComoFuncionaPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#F8F9FA] text-zinc-950">
      <Header />
      <SubNavbar />

      <section className="bg-gradient-to-br from-teal-50 via-white to-amber-50">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-teal-700 shadow-sm">
            ⭐ Fácil, seguro e com carinho
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
            Como funciona a locação?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Você escolhe os brinquedos e a BabyPlays cuida dos detalhes com você.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-4">
          {steps.map(([number, title, text], index) => (
            <article
              key={number}
              className="flex gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:items-center sm:p-6"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white ${
                index % 2 === 0 ? "bg-[#FF5A5F]" : "bg-teal-600"
              }`}>
                {number}
              </span>
              <div>
                <h2 className="text-lg font-black text-zinc-900">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{text}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
          O envio do pedido não confirma automaticamente a reserva. A confirmação
          depende da disponibilidade e do retorno da BabyPlays pelo WhatsApp.
        </p>

        <div className="mt-10 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 to-pink-50 p-6 sm:p-8">
          <span className="text-3xl" aria-hidden="true">💡</span>
          <h2 className="mt-3 text-2xl font-black text-zinc-950">
            Ficou em dúvida sobre qual brinquedo escolher?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Veja ideias no nosso Instagram ou fale com a BabyPlays para receber uma indicação.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/ajuda"
              className="inline-flex items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800"
            >
              Ir para Ajuda
            </Link>
            <ContactActions compact showInstagram={false} />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
