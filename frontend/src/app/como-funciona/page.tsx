import Image from "next/image";
import Link from "next/link";

import { ContactActions } from "@/components/client/ContactActions";
import { Footer } from "@/components/client/Footer";
import { Header } from "@/components/client/Header";
import { SubNavbar } from "@/components/client/SubNavBar";

const steps = [
  {
    number: "1",
    title: "Escolha brinquedos ou kits",
    text: "Escolha os brinquedos ou kits e selecione o período desejado.",
    accent: "bg-[#AB2E97]",
    surface: "border-[#AB2E97]/25 bg-[#F7EAF5]",
    decoration: "bg-[#76CFC8]/25",
  },
  {
    number: "2",
    title: "Finalize a solicitação",
    text: "Preencha os dados, aceite o contrato e envie sua solicitação de locação.",
    accent: "bg-[#F07F40]",
    surface: "border-[#F07F40]/30 bg-[#FFF1E8]",
    decoration: "bg-[#FAB555]/35",
  },
  {
    number: "3",
    title: "Confirme pelo WhatsApp",
    text: "A BabyPlays confirma as datas, entrega ou retirada e os próximos passos pelo WhatsApp.",
    accent: "bg-[#76CFC8] text-[#2C1615]",
    surface: "border-[#76CFC8]/50 bg-[#E8F8F6]",
    decoration: "bg-[#AB2E97]/12",
  },
  {
    number: "4",
    title: "Receba e aproveite",
    text: "Use os brinquedos conforme as orientações e sempre com supervisão de um adulto.",
    accent: "bg-[#EA524B]",
    surface: "border-[#EA524B]/25 bg-[#FDECEB]",
    decoration: "bg-[#FAB555]/30",
  },
  {
    number: "5",
    title: "Hora da devolução",
    text: "No fim do período confirmado, deixe os itens prontos para a retirada combinada.",
    accent: "bg-[#AB2E97]",
    surface: "border-[#AB2E97]/20 bg-[#F7EAF5]",
    decoration: "bg-[#76CFC8]/25",
  },
];

const benefits = [
  {
    title: "Mais variedade",
    text: "Troque a rotina com brinquedos diferentes para cada fase ou ocasião.",
    color: "border-[#AB2E97]/25 bg-[#F7EAF5]",
    accent: "bg-[#AB2E97]",
  },
  {
    title: "Menos acúmulo",
    text: "Aproveite brinquedos maiores e especiais sem precisar comprar e guardar tudo em casa.",
    color: "border-[#76CFC8]/50 bg-[#E8F8F6]",
    accent: "bg-[#76CFC8]",
  },
  {
    title: "Mais economia",
    text: "Ideal para testar, variar e escolher opções que façam sentido para a família.",
    color: "border-[#FAB555]/50 bg-[#FFF4DF]",
    accent: "bg-[#FAB555]",
  },
  {
    title: "Consumo mais consciente",
    text: "A locação prolonga o uso dos brinquedos e evita compras que logo ficam paradas.",
    color: "border-[#EA524B]/25 bg-[#FDECEB]",
    accent: "bg-[#EA524B]",
  },
];

const cities = [
  "Canoas",
  "Porto Alegre",
  "Cachoeirinha",
  "Nova Santa Rita",
  "Estância Velha",
  "Eldorado do Sul",
];

const REGION_WHATSAPP_MESSAGE =
  "Olá! Gostaria de confirmar se a BabyPlays atende minha região para locação de brinquedos.";

function ProcessMark({ number }: { number: string }) {
  if (number === "1") {
    return (
      <svg className="h-10 w-12" viewBox="0 0 48 40" fill="none" aria-hidden="true">
        <rect x="7" y="5" width="27" height="30" rx="6" fill="white" stroke="white" strokeWidth="2" />
        <rect x="11" y="9" width="19" height="12" rx="4" fill="#FFF4DF" />
        <circle cx="16" cy="15" r="3" fill="#76CFC8" />
        <path d="M22 14h6M22 18h4" stroke="#AB2E97" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M13 28h12"
          stroke="#FAB555"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="35" cy="27" r="9" fill="#AB2E97" stroke="white" strokeWidth="2" />
        <path
          d="m31 27 3 3 6-7"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (number === "2") {
    return (
      <div className="relative h-9 w-11 rounded-xl border-2 border-white bg-white/85" aria-hidden="true">
        <span className="absolute left-2 top-2 h-1.5 w-7 rounded-full bg-[#AB2E97]/45" />
        <span className="absolute left-2 top-4.5 h-1.5 w-5 rounded-full bg-[#76CFC8]" />
        <span className="absolute bottom-1.5 right-1.5 h-3 w-3 rotate-45 rounded-sm bg-[#F07F40]" />
      </div>
    );
  }

  if (number === "3") {
    return (
      <svg className="h-10 w-12" viewBox="0 0 48 40" fill="none" aria-hidden="true">
        <rect x="12" y="3" width="22" height="33" rx="7" fill="white" stroke="white" strokeWidth="2" />
        <rect x="15" y="8" width="16" height="18" rx="4" fill="#E8F8F6" />
        <path
          d="M20 16h15c3.3 0 6 2.7 6 6s-2.7 6-6 6h-4l-4 4v-4h-7c-3.3 0-6-2.7-6-6s2.7-6 6-6Z"
          fill="#AB2E97"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="m23 23 3 3 6-7"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="34" cy="11" r="4" fill="#FAB555" />
        <path d="M21 32h5" stroke="#76CFC8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (number === "4") {
    return (
      <Image
        src="/icons/receba-aproveite.png"
        alt=""
        width={96}
        height={80}
        className="h-12 w-16 object-contain"
        aria-hidden="true"
      />
    );
  }

  return (
    <Image
      src="/icons/hora-devolucao.png"
      alt=""
      width={102}
      height={80}
      className="h-12 w-16 object-contain"
      aria-hidden="true"
    />
  );
}

export default function ComoFuncionaPage() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-clip bg-[#FFF9F7] text-[#2C1615]">
      <Header />
      <SubNavbar />

      <div className="relative overflow-x-clip bg-gradient-to-b from-[#E8F8F6] via-[#FFF8EC] to-[#F7EAF5]">
        <section className="relative">
          <div className="absolute -left-14 -top-16 hidden h-44 w-44 rounded-full bg-[#FAB555]/45 sm:block" />
          <div className="absolute left-[10%] top-10 hidden h-4 w-4 rounded-full bg-[#EA524B] sm:block" />
          <div className="absolute -right-12 bottom-0 hidden h-40 w-40 rounded-full bg-[#AB2E97]/12 sm:block" />
          <div className="absolute right-[9%] top-9 hidden h-6 w-6 rotate-12 rounded-md bg-[#F07F40] sm:block" />

          <div className="relative mx-auto max-w-5xl px-4 py-8 text-center sm:px-6 sm:py-16">
            <span className="inline-flex rounded-full border border-[#76CFC8]/70 bg-white px-3 py-1.5 text-xs font-bold text-[#AB2E97] shadow-sm sm:px-4 sm:py-2 sm:text-sm">
              Um passo de cada vez
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#2C1615] sm:mt-5 sm:text-5xl [font-family:var(--font-fredoka)]">
              Como funciona a locação?
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-700 sm:mt-4 sm:text-lg sm:leading-7">
              Você escolhe os brinquedos e a BabyPlays cuida dos detalhes com você.
            </p>
            <div className="mx-auto mt-5 flex w-fit items-center gap-2 sm:mt-6" aria-hidden="true">
              <span className="h-2 w-12 rounded-full bg-[#AB2E97]" />
              <span className="h-2 w-5 rounded-full bg-[#EA524B]" />
              <span className="h-2 w-8 rounded-full bg-[#76CFC8]" />
            </div>
          </div>
        </section>

        <section className="relative mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6 sm:pb-16">
          <div className="absolute bottom-24 left-0 hidden h-28 w-28 -translate-x-1/2 rounded-full bg-[#76CFC8]/20 sm:block" />
          <div className="absolute right-0 top-1/3 hidden h-24 w-24 translate-x-1/2 rotate-12 rounded-[2rem] bg-[#FAB555]/25 sm:block" />

          <div className="relative grid gap-4">
            <div className="absolute bottom-8 left-6 top-8 hidden w-1 rounded-full bg-gradient-to-b from-[#AB2E97]/30 via-[#76CFC8]/45 to-[#EA524B]/25 md:block" />
            {steps.map((step) => (
              <article
                key={step.number}
                className={`relative flex gap-3 overflow-hidden rounded-2xl border p-4 shadow-sm sm:gap-4 sm:items-center sm:rounded-3xl sm:p-6 ${step.surface}`}
              >
                <span className={`absolute -right-8 -top-9 h-20 w-20 rounded-full sm:-right-7 sm:-top-8 sm:h-24 sm:w-24 ${step.decoration}`} />
                <div className="relative z-10 flex shrink-0 items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-black text-white shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl sm:text-lg ${step.accent}`}
                  >
                    {step.number}
                  </span>
                  <div className="hidden sm:block">
                    <ProcessMark number={step.number} />
                  </div>
                </div>
                <div className="relative z-10">
                  <h2 className="text-base font-bold text-[#2C1615] sm:text-lg [font-family:var(--font-fredoka)]">{step.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-700">{step.text}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="relative mt-5 rounded-2xl border border-[#FAB555]/60 bg-[#FFF4DF] px-4 py-3 text-sm font-medium leading-6 text-[#803233] shadow-sm sm:mt-6 sm:px-5 sm:py-4">
            O envio do pedido não confirma automaticamente a reserva. A confirmação
            depende da disponibilidade e do retorno da BabyPlays pelo WhatsApp.
          </p>

          <section
            id="onde-atendemos"
            className="relative mt-6 scroll-mt-28 overflow-hidden rounded-2xl border border-[#76CFC8]/50 bg-white/65 p-4 shadow-md shadow-[#76CFC8]/10 sm:mt-7 sm:rounded-3xl sm:p-6"
          >
            <span className="absolute -bottom-12 -right-10 hidden h-32 w-32 rounded-full bg-[#76CFC8]/25 sm:block" />
            <span className="absolute right-10 top-8 hidden h-4 w-4 rounded-full bg-[#F07F40] sm:block" />
            <div className="relative z-10">
              <h2 className="text-lg font-bold text-[#2C1615] sm:text-2xl [font-family:var(--font-fredoka)]">
                Onde atendemos?
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-700">
                Na confirmação pelo WhatsApp, a BabyPlays também combina
                datas, entrega e atendimento na sua região.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {cities.map((city, index) => (
                  <span
                    key={city}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold text-[#2C1615] sm:text-sm ${
                      index % 2 === 0
                        ? "border-[#76CFC8] bg-[#E8F8F6]"
                        : "border-[#FAB555] bg-[#FFF4DF]"
                    }`}
                  >
                    {city}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-zinc-700">
                Atendemos essas cidades e outras regiões mediante consulta.
              </p>
              <p className="mt-3 text-sm font-semibold text-[#803233]">
                Quer confirmar se entregamos na sua região?
              </p>
              <div className="mt-3">
                <ContactActions
                  compact
                  useBrandPalette
                  showInstagram={false}
                  whatsappLabel="Confirmar minha região"
                  whatsappMessage={REGION_WHATSAPP_MESSAGE}
                />
              </div>
            </div>
          </section>

          <section id="por-que-alugar" className="relative mt-7 scroll-mt-28 sm:mt-8">
            <span className="absolute -left-8 top-12 hidden h-20 w-20 rounded-full bg-[#AB2E97]/10 sm:block" />
            <div className="relative">
              <h2 className="text-xl font-bold text-[#2C1615] sm:text-2xl [font-family:var(--font-fredoka)]">
                Por que alugar brinquedos?
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-700 sm:text-base">
                Alugar é uma forma prática de renovar as brincadeiras sem acumular
                brinquedos em casa. A criança experimenta novas possibilidades e os
                brinquedos acompanham diferentes fases, interesses e momentos.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {benefits.map((benefit) => (
                  <article
                    key={benefit.title}
                    className={`relative overflow-hidden rounded-2xl border p-3.5 shadow-sm sm:p-4 ${benefit.color}`}
                  >
                    <span
                      className={`absolute -right-5 -top-6 h-16 w-16 rounded-full ${benefit.accent} opacity-15`}
                    />
                    <div className="relative z-10">
                      <span className={`mb-3 block h-2 w-9 rounded-full ${benefit.accent}`} />
                      <h3 className="text-base font-bold text-[#2C1615] [font-family:var(--font-fredoka)]">
                        {benefit.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-5 text-zinc-700 sm:text-sm">
                        {benefit.text}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <div className="relative mt-7 overflow-hidden rounded-2xl border border-[#AB2E97]/25 bg-white/75 p-5 shadow-lg shadow-[#AB2E97]/10 backdrop-blur-sm sm:mt-8 sm:rounded-3xl sm:p-8">
            <span className="absolute -right-8 -top-8 hidden h-28 w-28 rounded-full bg-[#76CFC8]/30 sm:block" />
            <span className="absolute right-8 top-7 hidden h-3 w-3 rounded-full bg-[#F07F40] sm:block" />
            <div className="relative z-10">
              <div className="mb-4 flex h-10 w-14 items-center gap-1.5" aria-hidden="true">
                <span className="h-8 w-8 -rotate-6 rounded-xl bg-[#AB2E97]" />
                <span className="h-6 w-6 rotate-6 rounded-lg bg-[#FAB555]" />
                <span className="h-3 w-3 rounded-full bg-[#EA524B]" />
              </div>
              <h2 className="text-xl font-bold text-[#2C1615] sm:text-2xl [font-family:var(--font-fredoka)]">
                Ainda em dúvida sobre qual brinquedo escolher?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">
                Veja ideias no Instagram da BabyPlays ou fale com a equipe para
                receber uma sugestão mais personalizada.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/ajuda"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#AB2E97] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#803233] [font-family:var(--font-fredoka)]"
                >
                  Ir para Ajuda
                </Link>
                <ContactActions
                  compact
                  useBrandPalette
                  showInstagram={false}
                  whatsappLabel="Falar no WhatsApp"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
