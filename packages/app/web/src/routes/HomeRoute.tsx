export function HomeRoute() {
  return (
    <div className="min-h-screen">
      <nav className="bg-ink text-header-foreground px-6 py-4">
        <span className="text-xl font-bold">
          <span className="text-gold">Logic</span>Rush
        </span>
      </nav>
      <div className="bg-brand h-16" />
      <main className="mx-auto max-w-5xl p-6">
        <div className="bg-card rounded-md shadow-sm">
          <div className="bg-header text-header-foreground rounded-t-md px-4 py-3 font-semibold">
            معلومات هامة
          </div>
          <p className="p-4">
            موقع تعليميّ، أسّس ليُنمّي مَلَكات التفكير الحسابي والمنطقي من خلال إقامة مسابقات دوريّة.
          </p>
        </div>
      </main>
    </div>
  )
}
