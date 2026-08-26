export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-brand-600 grid size-9 shrink-0 place-items-center rounded-[0.6rem]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          <path d="M8.5 10.5a2.5 2.5 0 1 1 5 0v3a4 4 0 0 1-8 0v-1" />
          <circle cx="17.5" cy="9" r="2.5" />
          <path d="M17.5 11.5v3a4 4 0 0 1-4 4" />
        </svg>
      </div>
      <span className="text-brand-700 text-lg font-bold tracking-tight">
        CAREPROFS
      </span>
    </div>
  )
}
