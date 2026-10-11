import * as React from 'react'
import { Check, Copy, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
export interface AnswerProps extends React.HTMLAttributes<HTMLElement> { sources?: string[]; copyText?: string; size?: 'sm'|'md' }
export const Answer=React.forwardRef<HTMLElement,AnswerProps>(({children,sources=[],copyText,size='md',className,...props},ref)=>{
 const [copied,setCopied]=React.useState(false); const [failed,setFailed]=React.useState(false); const timer=React.useRef<ReturnType<typeof setTimeout>|null>(null)
 React.useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])
 return <article ref={ref} className={cn('space-y-4',className)} {...props}><div className={cn('font-sans leading-[var(--leading-body)] text-ink',size==='md'?'text-base':'text-sm')}>{children}</div><div className="flex items-start justify-between gap-4">{sources.length>0&&<details><summary className="inline-flex cursor-pointer list-none items-center gap-2 fp-control fp-pill border px-3 py-2 text-sm text-primary focus-visible:outline-2 focus-visible:outline-ring">{sources.length} sources<ChevronDown className="size-3"/></summary><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{sources.map(s=><li key={s}>{s}</li>)}</ul></details>}{copyText&&<Button variant="ghost" size="sm" title={copied?'Copied':'Copy answer'} aria-label={copied?'Copied':'Copy answer'} onClick={async()=>{try{await navigator.clipboard.writeText(copyText);setCopied(true);setFailed(false);timer.current=setTimeout(()=>setCopied(false),2000)}catch{setFailed(true)}}}>{copied?<Check/>:<Copy/>}</Button>}</div>{failed&&<p role="status" className="text-sm text-destructive">Could not copy. Select the answer to copy it.</p>}</article>
})
Answer.displayName='Answer'
