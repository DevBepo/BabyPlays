import Link from "next/link";

import { ContactActions } from "@/components/client/ContactActions";
import { Footer } from "@/components/client/Footer";
import { Header } from "@/components/client/Header";
import { SubNavbar } from "@/components/client/SubNavBar";

const helpCards = [
  {
    icon: "🧸",
    title: "Não sei qual brinquedo escolher",
    text: "Conte a idade da criança e o tipo de brincadeira que ela gosta. A gente ajuda a encontrar uma opção especial.",
    color: "bg-violet-50 border-violet-100",
  },
  {
    icon: "✨",
    title: "Quero ver ideias reais",
    text: "Veja no Instagram brinquedos, kits e inspirações para diferentes momentos em família.",
    color: "bg-pink-50 border-pink-100",
  },
  {
    icon: "🚚",
    title: "Tenho dúvida sobre entrega ou período",
    text: "As datas exatas, a entrega e a retirada são confirmadas pela equipe no WhatsApp depois do pedido.",
    color: "bg-amber-50 border-amber-100",
  },
  {
    icon: "🎁",
    title: "Quero escolher por idade ou montar um kit",
    text: "Fale com a BabyPlays e receba uma sugestão mais personalizada para a sua ocasião.",
    color: "bg-teal-50 border-teal-100",
  },
];

export default function AjudaPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#FFF9F7] text-zinc-950">
      <Header />
      <SubNavbar />

      <section className="relative overflow-hidden border-b border-pink-100 bg-gradient-to-br from-violet-50 via-white to-pink-50">
        <div className="absolute -left-12 top-10 h-36 w-36 rounded-full bg-amber-200/30 blur-2xl" />
        <div className="absolute -right-8 bottom-0 h-44 w-44 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-sm">
            💜 Pode chamar, a gente ajuda
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            Dúvidas sobre qual brinquedo escolher?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Não sabe qual brinquedo combina mais com a sua criança ou com o momento
            da família? A gente te ajuda! Veja ideias ou mande uma mensagem para
            receber uma sugestão personalizada.
          </p>
          <div className="mt-8 flex justify-center">
            <ContactActions />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-4 md:grid-cols-2">
          {helpCards.map((card) => (
            <article
              key={card.title}
              className={`rounded-3xl border p-6 shadow-sm ${card.color}`}
            >
              <span className="text-3xl" aria-hidden="true">{card.icon}</span>
              <h2 className="mt-4 text-lg font-black text-zinc-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{card.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-3xl bg-violet-700 px-6 py-7 text-center text-white shadow-lg shadow-violet-200 sm:flex-row sm:text-left">
          <div>
            <p className="text-lg font-black">Quer entender o passo a passo?</p>
            <p className="mt-1 text-sm text-violet-100">
              Veja como escolher, enviar o pedido e confirmar os detalhes.
            </p>
          </div>
          <Link
            href="/como-funciona"
            className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-50"
          >
            Ver como funciona
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
