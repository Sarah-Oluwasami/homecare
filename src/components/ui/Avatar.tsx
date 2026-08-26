import { cn } from '@/lib/cn'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

interface AvatarProps {
  name: string
  /**
   * Set when the person's name is already rendered next to the avatar —
   * otherwise screen readers announce "MJ Margaret Johnson".
   */
  decorative?: boolean
  className?: string
}

export function Avatar({ name, decorative, className }: AvatarProps) {
  return (
    <span
      aria-hidden={decorative || undefined}
      title={decorative ? undefined : name}
      className={cn(
        'bg-brand-100 text-brand-700 grid shrink-0 place-items-center rounded-full text-xs font-semibold',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
