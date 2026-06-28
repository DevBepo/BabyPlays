import type { ReactNode } from "react";

import { Footer } from "@/components/client/Footer";
import { Header } from "@/components/client/Header";

interface AuthPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  wide = false,
}: AuthPageShellProps) {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#FFF9F7] text-[#2C1615]">
      <Header />

      <div className="relative overflow-hidden bg-gradient-to-b from-[#FFF4DF] via-[#F1FBF9] to-[#FFF8EC] px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <span className="pointer-events-none absolute -left-14 top-12 h-36 w-36 rounded-full bg-[#FAB555]/25 sm:h-48 sm:w-48" />
        <span className="pointer-events-none absolute right-[9%] top-20 hidden h-5 w-5 rounded-full bg-[#EA524B]/75 sm:block" />
        <span className="pointer-events-none absolute -right-16 bottom-14 h-44 w-44 rotate-12 rounded-[3rem] bg-[#76CFC8]/20 sm:h-52 sm:w-52" />
        <span className="pointer-events-none absolute bottom-12 left-[14%] hidden h-16 w-16 rounded-full bg-[#AB2E97]/8 md:block" />

        <div className={`relative mx-auto w-full ${wide ? "max-w-2xl" : "max-w-lg"}`}>
          <div className="mb-6 text-center sm:mb-8">
            <div className="mb-3 flex items-center justify-center gap-2" aria-hidden="true">
              <span className="h-2 w-10 rounded-full bg-[#AB2E97]" />
              <span className="h-2 w-4 rounded-full bg-[#76CFC8]" />
              <span className="h-2 w-2 rounded-full bg-[#F07F40]" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#AB2E97]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#2C1615] [font-family:var(--font-fredoka)] sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#803233]/75 sm:text-base">
              {description}
            </p>
          </div>

          <section className="rounded-3xl border border-[#AB2E97]/12 bg-white/95 p-5 shadow-xl shadow-[#803233]/8 backdrop-blur-sm sm:p-8">
            {children}
          </section>

          <div className="mt-6 text-center text-sm text-[#803233]/80">{footer}</div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
