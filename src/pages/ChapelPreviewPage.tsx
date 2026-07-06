export default function ChapelPreviewPage() {
  const chapelUrl = import.meta.env.VITE_CHAPEL_URL || 'https://nu-chapel.vercel.app'

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-180px)]">
      <header>
        <div className="nu-eyebrow">Chapel Display</div>
        <h1 className="font-serif text-[44px] text-nu-wisp leading-none mt-2">
          Chapel Screen Preview
        </h1>
        <p className="text-[14px] text-nu-skylight mt-3 max-w-xl">
          Live preview of the chapel display. On Mondays this screen shows the
          Reach Church experience; Tuesday–Sunday it shows the regular chapel
          rotation.
        </p>
      </header>

      <div className="flex-1 nu-card p-4 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] text-nu-skylight/70 font-mono truncate">
            {chapelUrl}
          </span>
          <a
            href={chapelUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[12px] text-nu-tour hover:text-nu-wisp transition-colors"
          >
            Open in new tab →
          </a>
        </div>
        <div className="flex-1 relative rounded-lg overflow-hidden border border-white/10 bg-black">
          <iframe
            src={chapelUrl}
            title="Chapel display preview"
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen"
            loading="eager"
          />
        </div>
      </div>
    </div>
  )
}
