export function StubPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-[15px] opacity-65">
        {title} is coming in a later phase of the admin dashboard build.
      </p>
    </div>
  )
}
