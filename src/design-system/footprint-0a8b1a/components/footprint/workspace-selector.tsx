import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
export interface WorkspaceOption { value:string; label:string }
export interface WorkspaceSelectorProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>,'size'> { options:WorkspaceOption[]; size?:'sm'|'md' }
/** Single controlled workspace selection, with native keyboard navigation. */
export const WorkspaceSelector=React.forwardRef<HTMLSelectElement,WorkspaceSelectorProps>(({options,size='md',className,...props},ref)=><div className="relative inline-flex"><select ref={ref} aria-label="Workspace" className={cn('fp-control fp-pill appearance-none border bg-card pl-4 pr-10 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',size==='sm'?'text-xs':'text-sm',className)} {...props}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="fp-icon pointer-events-none absolute right-3 top-3 text-muted-foreground"/></div>)
WorkspaceSelector.displayName='WorkspaceSelector'
