import * as React from 'react'
import { cn } from '../../lib/utils'
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> { variant?: 'indexed' | 'processing' | 'reference'; size?: 'sm' | 'md' }
export const Badge = React.forwardRef<HTMLSpanElement,BadgeProps>(({variant='indexed',size='sm',className,children,...props},ref)=><span ref={ref} className={cn('inline-flex items-center gap-1 rounded-sm',size==='sm'?'px-2 py-1 text-xs':'px-3 py-1 text-sm',{indexed:'bg-accent text-primary',processing:'bg-success-surface text-success',reference:'bg-reference-surface text-reference'}[variant],className)} {...props}>{children}</span>)
Badge.displayName='Badge'
