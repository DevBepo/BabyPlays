import Image from "next/image";

import { ContactActions } from "@/components/client/ContactActions";
import { Footer } from "@/components/client/Footer";
import { Header } from "@/components/client/Header";
import { SubNavbar } from "@/components/client/SubNavBar";

const helpCards = [
  {
    visual: "blocks",
    title: "Brinquedos para cada momento",
    text: "A escolha pode considerar a fase da criança, seus interesses e o tipo de estímulo: movimento, imaginação, coordenação, exploração sensorial ou brincadeiras em grupo.",
    color: "border-[#AB2E97]/25 bg-[#AB2E97]/10",
    decoration: "topRight",
  },
  {
    visual: "confetti",
    title: "Para casa, festas ou encontros",
    text: "Você pode alugar brinquedos para renovar a rotina em casa, criar um cantinho especial ou complementar aniversários e encontros em família.",
    color: "border-[#EA524B]/30 bg-[#EA524B]/10",
    decoration: "bottomLeft",
  },
  {
    visual: "space",
    title: "De acordo com o espaço",
    text: "A BabyPlays ajuda a pensar em opções que combinem com o ambiente disponível e com a experiência que você quer criar.",
    color: "border-[#FAB555]/50 bg-[#FAB555]/20",
    decoration: "dots",
  },
  {
    visual: "calendar",
    title: "Disponibilidade e datas",
    text: "Depois da escolha, a equipe confirma pelo WhatsApp a disponibilidade da data de entrega e retirada, o período da locação e os detalhes finais do pedido.",
    color: "border-[#76CFC8]/50 bg-[#76CFC8]/20",
    decoration: "softBlob",
  },
];

function CardDecoration({
  type,
}: {
  type: "topRight" | "bottomLeft" | "dots" | "softBlob";
}) {
  if (type === "topRight") {
    return (
      <>
        <span className="absolute -right-7 -top-8 h-24 w-24 rounded-full bg-[#76CFC8]/25" />
        <span className="absolute right-6 top-5 h-3 w-3 rounded-full bg-[#F07F40]" />
      </>
    );
  }

  if (type === "bottomLeft") {
    return (
      <>
        <span className="absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-[#FAB555]/35" />
        <span className="absolute bottom-5 left-7 h-3 w-3 rounded-full bg-[#AB2E97]" />
      </>
    );
  }

  if (type === "dots") {
    return (
      <>
        <span className="absolute right-5 top-5 h-4 w-4 rounded-full bg-[#EA524B]/30" />
        <span className="absolute right-10 top-10 h-2.5 w-2.5 rounded-full bg-[#AB2E97]/50" />
        <span className="absolute right-5 top-14 h-2 w-2 rounded-full bg-[#76CFC8]" />
      </>
    );
  }

  return (
    <>
      <span className="absolute -bottom-8 -right-5 h-24 w-28 rotate-12 rounded-[45%] bg-[#AB2E97]/12" />
      <span className="absolute bottom-5 right-8 h-3 w-3 rounded-full bg-[#F07F40]/80" />
    </>
  );
}

function BrandVisual({
  type,
}: {
  type: "feed" | "conversation" | "blocks" | "confetti" | "space" | "calendar";
}) {
  if (type === "feed") {
    return (
      <div className="relative h-12 w-14" aria-hidden="true">
        <span className="absolute bottom-0 left-0 h-8 w-8 -rotate-6 rounded-xl bg-[#AB2E97]" />
        <span className="absolute right-0 top-0 h-8 w-8 rotate-6 rounded-xl bg-[#FAB555]" />
        <span className="absolute bottom-1 right-2 h-7 w-7 rounded-lg border-2 border-white bg-[#EA524B]" />
        <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-white" />
      </div>
    );
  }

  if (type === "conversation") {
    return (
      <div className="relative h-12 w-16" aria-hidden="true">
        <span className="absolute left-0 top-0 h-8 w-11 rounded-2xl rounded-bl-md bg-[#76CFC8]" />
        <span className="absolute bottom-0 right-0 h-8 w-10 rounded-2xl rounded-br-md bg-[#AB2E97]" />
        <span className="absolute left-3 top-3 h-1.5 w-5 rounded-full bg-[#2C1615]/55" />
        <span className="absolute bottom-3 right-3 h-1.5 w-4 rounded-full bg-white/80" />
      </div>
    );
  }

  if (type === "blocks") {
    return (
      <div className="relative h-12 w-16" aria-hidden="true">
        <span className="absolute bottom-0 left-0 h-7 w-7 rounded-lg border-2 border-white bg-[#76CFC8] shadow-sm">
          <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white/80" />
        </span>
        <span className="absolute bottom-0 left-6 h-8 w-8 rounded-lg border-2 border-white bg-[#EA524B] shadow-sm">
          <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-white/80" />
        </span>
        <span className="absolute bottom-7 left-7 h-6 w-7 rounded-lg border-2 border-white bg-[#FAB555] shadow-sm">
          <span className="absolute left-2 top-1.5 h-2 w-2 rounded-full bg-[#AB2E97]/55" />
        </span>
      </div>
    );
  }

  if (type === "confetti") {
    return (
      <div className="relative h-12 w-16" aria-hidden="true">
        <span className="absolute left-1 top-2 h-0.5 w-14 rotate-[-5deg] rounded-full bg-[#803233]/45" />
        <span className="absolute left-1 top-2 h-6 w-5 origin-top -rotate-6 rounded-b-lg bg-[#AB2E97]" />
        <span className="absolute left-[22px] top-1 h-7 w-5 origin-top rounded-b-lg bg-[#FAB555]" />
        <span className="absolute right-1 top-0 h-7 w-5 origin-top rotate-6 rounded-b-lg bg-[#76CFC8]" />
        <span className="absolute bottom-0 left-2 h-2 w-2 rounded-full bg-[#EA524B]" />
        <span className="absolute bottom-1 right-2 h-2 w-4 rotate-12 rounded-full bg-[#F07F40]" />
      </div>
    );
  }

  if (type === "space") {
    return (
      <div className="relative h-12 w-16" aria-hidden="true">
        <span className="absolute inset-x-0 bottom-0 h-10 rounded-[1rem] border-2 border-[#803233]/50 bg-white/75 shadow-sm" />
        <span className="absolute bottom-1.5 left-2 h-6 w-11 rounded-lg border border-[#FAB555] bg-[#FAB555]/40" />
        <span className="absolute bottom-3 left-3.5 h-3 w-3 rounded-md bg-[#AB2E97]" />
        <span className="absolute bottom-3 right-3.5 h-3 w-3 rounded-full bg-[#76CFC8]" />
        <span className="absolute bottom-2.5 left-[27px] h-4 w-4 rounded-full border-2 border-[#EA524B] bg-white" />
      </div>
    );
  }

  return (
    <div className="relative h-12 w-14 rounded-xl border-2 border-[#AB2E97]/45 bg-white shadow-sm" aria-hidden="true">
      <span className="absolute inset-x-0 top-0 h-3 rounded-t-[10px] bg-[#AB2E97]" />
      <span className="absolute left-2 top-[-3px] h-3 w-1.5 rounded-full bg-[#803233]" />
      <span className="absolute right-2 top-[-3px] h-3 w-1.5 rounded-full bg-[#803233]" />
      <span className="absolute left-2 top-5 h-2 w-2 rounded-full bg-[#FAB555]" />
      <span className="absolute left-5 top-5 h-2 w-2 rounded-full bg-[#76CFC8]" />
      <span className="absolute left-2 top-8 h-2 w-2 rounded-full bg-[#EA524B]/45" />
      <span className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#76CFC8]">
        <span className="h-2 w-3 rotate-[-45deg] border-b-2 border-l-2 border-[#2C1615]" />
      </span>
    </div>
  );
}

export default function AjudaPage() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-clip bg-[#FFF9F7] text-[#2C1615]">
      <Header />
      <SubNavbar />

      <div className="relative overflow-x-clip bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC]">
      <section className="relative">
        <div className="absolute -left-16 -top-16 hidden h-44 w-44 rounded-full bg-[#76CFC8]/45 sm:block" />
        <div className="absolute left-[12%] top-12 hidden h-5 w-5 rounded-full bg-[#EA524B] sm:block" />
        <div className="absolute bottom-8 left-[7%] hidden h-3 w-3 rounded-full bg-[#AB2E97] sm:block" />
        <div className="absolute -right-12 bottom-4 hidden h-40 w-40 rounded-full bg-[#AB2E97]/12 sm:block" />
        <div className="absolute right-[8%] top-8 hidden h-6 w-6 rotate-12 rounded-md bg-[#F07F40] sm:block" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-7 px-4 py-7 sm:px-6 sm:py-12 md:grid-cols-[minmax(0,1fr)_280px] md:text-left">
          <div className="text-center md:text-left">
            <span className="inline-flex rounded-full border border-[#AB2E97]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#AB2E97] shadow-sm sm:px-4 sm:py-2 sm:text-sm">
              💜 Pode chamar, a gente ajuda
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-[#2C1615] sm:mt-5 sm:text-5xl">
              Precisa de ajuda para escolher?
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-700 sm:mt-5 sm:text-lg sm:leading-7">
              Cada fase tem uma brincadeira ideal. A BabyPlays ajuda a escolher
              brinquedos que combinem com o momento da criança, seja para
              explorar, engatinhar, andar, imaginar, gastar energia ou brincar
              junto com outras crianças.
            </p>
            <div className="mx-auto mt-5 h-2 w-20 rounded-full bg-[#EA524B] sm:mt-6 sm:w-24 md:mx-0" />
          </div>

          <div className="relative mx-auto hidden w-full max-w-[260px] md:block">
            <div className="absolute -inset-3 rotate-3 rounded-[2.5rem] bg-[#76CFC8]" />
            <div className="absolute -right-5 -top-5 h-12 w-12 rounded-full bg-[#AB2E97]" />
            <div className="relative overflow-hidden rounded-[2.25rem] border-4 border-white bg-white shadow-xl shadow-[#803233]/15">
              <Image
                src="/assets/SomenteLogo.jpg"
                alt="Mascote onça da BabyPlays"
                width={420}
                height={336}
                className="aspect-[5/4] w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="absolute -left-12 bottom-5 hidden h-32 w-32 rounded-full bg-[#76CFC8]/20 sm:block" />
        <div className="absolute left-[8%] top-8 hidden h-3 w-3 rounded-full bg-[#F07F40] sm:block" />
        <div className="absolute -right-10 top-6 hidden h-28 w-28 rotate-12 rounded-[2rem] bg-[#FAB555]/25 sm:block" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-10 lg:grid-cols-2">
          <article className="relative flex flex-col overflow-hidden rounded-2xl border border-[#AB2E97]/30 bg-[#F7EAF5] p-5 shadow-lg shadow-[#AB2E97]/10 sm:rounded-3xl sm:p-8">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#EA524B]/20" />
            <div className="absolute right-8 top-7 h-3 w-3 rounded-full bg-[#F07F40]" />
            <BrandVisual type="feed" />
            <h2 className="mt-4 text-xl font-black text-[#2C1615] sm:text-2xl">
              Quero ver ideias primeiro
            </h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-zinc-600 sm:text-base sm:leading-7">
              Veja brinquedos, kits e inspirações no Instagram da BabyPlays para
              descobrir opções que combinam com diferentes idades e ocasiões.
            </p>
            <div className="mt-5 sm:mt-6">
              <ContactActions
                useBrandPalette
                showWhatsApp={false}
                instagramLabel="Ver Instagram"
              />
            </div>
          </article>

          <article className="relative flex flex-col overflow-hidden rounded-2xl border border-[#76CFC8] bg-[#E8F8F6] p-5 shadow-lg shadow-[#76CFC8]/20 sm:rounded-3xl sm:p-8">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#AB2E97]/15" />
            <div className="absolute right-8 top-7 h-3 w-3 rounded-full bg-[#F07F40]" />
            <BrandVisual type="conversation" />
            <h2 className="mt-4 text-xl font-black text-[#2C1615] sm:text-2xl">
              Quero ajuda para escolher
            </h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-zinc-600 sm:text-base sm:leading-7">
              Conte a idade da criança, a ocasião e o que você está procurando. A
              BabyPlays te ajuda com uma sugestão mais personalizada.
            </p>
            <div className="mt-5 sm:mt-6">
              <ContactActions
                useBrandPalette
                showInstagram={false}
                whatsappLabel="Falar no WhatsApp"
              />
            </div>
          </article>
        </div>
      </section>

      <section className="relative">
        <div className="absolute -left-10 top-16 hidden h-24 w-24 rotate-12 rounded-[1.75rem] bg-[#AB2E97]/10 sm:block" />
        <div className="absolute bottom-8 left-[5%] hidden h-4 w-4 rounded-full bg-[#EA524B]/70 sm:block" />
        <div className="absolute -right-14 bottom-10 hidden h-36 w-36 rounded-full bg-[#76CFC8]/25 sm:block" />
        <div className="absolute right-[9%] top-10 hidden h-3 w-3 rounded-full bg-[#AB2E97] sm:block" />

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-10">
          <p className="mb-4 text-base font-semibold text-[#AB2E97] sm:mb-5 sm:text-xl [font-family:var(--font-fredoka)]">
            Na hora de escolher, alguns pontos ajudam:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {helpCards.map((card) => (
              <article
                key={card.title}
                className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5 ${card.color}`}
              >
                <CardDecoration
                  type={
                    card.decoration as
                      | "topRight"
                      | "bottomLeft"
                      | "dots"
                      | "softBlob"
                  }
                />
                <div className="relative z-10">
                  <BrandVisual
                    type={card.visual as "blocks" | "confetti" | "space" | "calendar"}
                  />
                  <h3 className="mt-3 text-base font-black text-[#2C1615]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{card.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      </div>

      <Footer />
    </main>
  );
}
