/**
 * The agency's own mark, from `public/icons/cp-icon.png`. It carries its own
 * shield and colour, so it is not sat on a brand-coloured tile the way the
 * drawn placeholder was — a tile would box a shape that is already a shape.
 *
 * Width and height are set because the file is 76×81, not square: leaving them
 * off let the layout shift while the image loaded.
 */
export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/icons/cp-icon.png"
        width={76}
        height={81}
        alt=""
        aria-hidden="true"
        className="h-9 w-auto shrink-0"
      />
      <span className="text-brand-700 text-lg font-bold tracking-tight">
        CAREPROFS
      </span>
    </div>
  )
}
