import * as React from 'react'
import { cn } from '../../lib/utils'
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> { variant?: 'default' | 'error'; size?: 'sm' | 'md' }
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({className, variant='default',size='md',...props},ref)=><input ref={ref} className={cn('fp-control w-full rounded-md border bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40',size==='sm'?'h-8':'h-10',variant==='error'?'border-destructive':'border-border',className)} aria-invalid={variant==='error'||undefined} {...props}/>)
Input.displayName='Input'
