import * as React from 'react'
import { FileText, ArrowUpRight, Link2 } from 'lucide-react'
import { cn } from '../../lib/utils'
export interface CitationChipProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> { kind?:'file'|'link'; size?:'sm'|'md' }
/** Use for linked source attribution. Supply a real destination. */
export const CitationChip=React.forwardRef<HTMLAnchorElement,CitationChipProps>(({kind='file',size='sm',className,children,...props},ref)=><a ref={ref} className={cn('fp-control fp-pill inline-flex max-w-full items-center gap-2 border bg-card px-3 text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',size==='sm'?'text-xs':'text-sm',className)} {...props}>{kind==='file'?<FileText className="fp-icon shrink-0"/>:<Link2 className="fp-icon shrink-0"/>}<span className="min-w-0 truncate">{children}</span><ArrowUpRight className="fp-icon shrink-0"/></a>)
CitationChip.displayName='CitationChip'
