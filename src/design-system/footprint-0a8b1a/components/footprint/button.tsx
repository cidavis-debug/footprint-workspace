import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
export const buttonVariants = cva('fp-control inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:opacity-40 disabled:pointer-events-none [&_svg]:size-5', { variants: { variant: { primary: 'bg-primary text-primary-foreground hover:bg-primary/90', secondary: 'border border-primary/60 text-ink hover:bg-muted', ghost: 'text-primary hover:bg-accent', quiet: 'border border-border text-foreground hover:bg-muted' }, size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6', icon: 'size-11 p-0' } }, defaultVariants: { variant: 'primary', size: 'md' } })
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { loading?: boolean }
/** Use for actions. Icon-only actions require aria-label. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading, disabled, children, ...props }, ref) => <button ref={ref} type="button" className={cn(buttonVariants({variant,size}),className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{loading && <LoaderCircle className="animate-spin"/>}{children}</button>)
Button.displayName = 'Button'
