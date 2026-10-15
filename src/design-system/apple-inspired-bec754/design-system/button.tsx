import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import { cn } from './utils';
export const buttonVariants = cva('inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-label fp-transition focus-visible:outline-focus disabled:bg-disabled disabled:text-disabled-foreground disabled:shadow-none disabled:cursor-not-allowed [&_svg]:size-4', {
  variants: { variant: { primary: 'bg-primary text-primary-foreground shadow-signal hover:bg-primary-hover active:bg-primary-active', secondary: 'bg-surface text-foreground border border-border shadow-soft hover:bg-surface-secondary active:bg-disabled', ghost: 'text-muted-foreground hover:bg-surface-secondary hover:text-foreground active:bg-disabled', destructive: 'bg-destructive text-surface hover:opacity-90', icon: 'bg-surface text-foreground border border-border hover:bg-surface-secondary' }, size: { sm: 'h-8 px-3 text-caption', md: 'h-10 px-4', lg: 'h-12 px-6', icon: 'size-10 p-0' } }, defaultVariants: { variant: 'primary', size: 'md' }
});
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { loading?: boolean; }
/** A keyboard-accessible action with fixed visual variants and loading feedback. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading, disabled, children, type = 'button', ...props }, ref) => <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{loading && <LoaderCircle className="fp-spinner" aria-hidden="true" />}{children}</button>);
Button.displayName = 'Button';