import * as React from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { AddSourceMenu } from './add-source-menu'
export interface ComposerProps extends Omit<React.HTMLAttributes<HTMLFormElement>,'onSubmit'> { onSend?: (value:string)=>void; onUpload?: ()=>void; onAddLink?: ()=>void; placeholder?: string; disabled?: boolean; loading?: boolean; variant?: 'default'|'error'; size?: 'compact'|'comfortable' }
export const Composer=React.forwardRef<HTMLFormElement,ComposerProps>(({onSend,onUpload,onAddLink,placeholder='Ask your workspace…',disabled,loading,variant='default',size='comfortable',className,...props},ref)=>{
 const [value,setValue]=React.useState(''); const submit=()=>{if(value.trim()&&!disabled&&!loading){onSend?.(value.trim());setValue('')}}
 return <form ref={ref} className={cn('fp-composer rounded-lg border bg-card p-4 focus-within:ring-2 focus-within:ring-primary/20',variant==='error'?'border-destructive':'border-border',className)} onSubmit={e=>{e.preventDefault();submit()}} {...props}><textarea aria-label="Ask your workspace" aria-invalid={variant==='error'||undefined} disabled={disabled||loading} placeholder={placeholder} value={value} onChange={e=>setValue(e.target.value)} className={cn('w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-40',size==='comfortable'?'h-20':'h-12')}/><div className="flex items-center justify-between"><AddSourceMenu onUpload={onUpload} onAddLink={onAddLink}/><Button type="submit" size="icon" className="rounded-full" title="Send question" aria-label="Send question" disabled={!value.trim()||disabled} loading={loading}><ArrowUp/></Button></div></form>
})
Composer.displayName='Composer'
