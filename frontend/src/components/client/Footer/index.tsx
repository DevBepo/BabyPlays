export function Footer() {
  const instagramUrl = process.env.NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL;

  return (
    <footer className="mt-8 border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} BabyPlays.Brinquedos</span>
        {instagramUrl ? (
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#7C3AED] hover:underline">
            Instagram da BabyPlays
          </a>
        ) : null}
      </div>
    </footer>
  );
}
