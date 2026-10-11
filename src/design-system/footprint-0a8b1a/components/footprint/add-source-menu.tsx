import * as React from 'react'
import { FilePlus2, Link2, Plus } from 'lucide-react'
import { Button } from './button'
import { cn } from '../../lib/utils'
export interface AddSourceMenuProps extends React.HTMLAttributes<HTMLDivElement> { onUpload?: ()=>void; onAddLink?: ()=>void }
export const AddSourceMenu = React.forwardRef<HTMLDivElement,AddSourceMenuProps>(({onUpload,onAddLink,className,...props},ref)=>{
 const [open,setOpen]=React.useState(false); const host=React.useRef<HTMLDivElement>(null); const trigger=React.useRef<HTMLButtonElement>(null); const first=React.useRef<HTMLButtonElement>(null)
 React.useEffect(()=>{if(!open)return;first.current?.focus();const close=(e:MouseEvent)=>{if(e.target instanceof Node&&!host.current?.contains(e.target))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[open])
 return <div ref={ref} className={cn('relative inline-block',className)} {...props}><div ref={host} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus()}}}><Button ref={trigger} variant="quiet" size="icon" aria-label="Add source" title="Add source" aria-expanded={open} aria-haspopup="true" onClick={()=>setOpen(!open)}><Plus/></Button>{open&&<div className="absolute left-0 top-full z-30 mt-2 w-44 rounded-lg border bg-card p-2 shadow-surface transition-[opacity,transform] duration-[var(--duration-panel)] ease-[var(--ease-standard)]"><Button ref={first} variant="ghost" className="w-full justify-start text-foreground" onClick={()=>{setOpen(false);onUpload?.();trigger.current?.focus()}}><FilePlus2/>Upload file</Button><Button variant="ghost" className="w-full justify-start text-foreground" onClick={()=>{setOpen(false);onAddLink?.();trigger.current?.focus()}}><Link2/>Add link</Button></div>}</div></div>
})
AddSourceMenu.displayName='AddSourceMenu'
