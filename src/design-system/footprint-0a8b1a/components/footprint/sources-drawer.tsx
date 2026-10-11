import * as React from 'react'
import { X, Search, Plus } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { cn } from '../../lib/utils'
export interface SourcesDrawerProps extends React.DialogHTMLAttributes<HTMLDialogElement> { open: boolean; onClose: ()=>void; onAddSource?: ()=>void; children?: React.ReactNode; onSearch?: (value:string)=>void }
export const SourcesDrawer=React.forwardRef<HTMLDialogElement,SourcesDrawerProps>(({open,onClose,onAddSource,onSearch,children,className,...props},forwardedRef)=>{
 const dialog=React.useRef<HTMLDialogElement>(null); const id=React.useId();React.useImperativeHandle(forwardedRef,()=>dialog.current as HTMLDialogElement)
 React.useEffect(()=>{const el=dialog.current;if(!el)return;if(open&&!el.open)el.showModal();if(!open&&el.open)el.close()},[open])
 return <dialog ref={dialog} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}} aria-labelledby={id} className={cn('fixed left-auto right-4 top-4 m-0 h-[calc(100dvh-2rem)] max-h-none fp-panel max-w-[calc(100vw-2rem)] rounded-lg border bg-card p-0 text-foreground backdrop:bg-foreground/20',className)} {...props}><div className="flex h-full flex-col p-5"><div className="mb-5 flex items-center justify-between"><h2 id={id} className="text-h4">Sources</h2><Button variant="ghost" size="sm" aria-label="Close sources" title="Close sources" onClick={onClose}><X/></Button></div><div className="relative"><Search className="absolute left-3 top-3 fp-icon text-muted-foreground"/><Input aria-label="Search sources" placeholder="Search sources…" className="pl-9" onChange={e=>onSearch?.(e.target.value)}/></div><div className="mt-4 flex-1 overflow-auto">{children}</div><Button variant="ghost" className="mt-4 justify-start border-t rounded-none" onClick={onAddSource}><Plus/>Add source</Button></div></dialog>
})
SourcesDrawer.displayName='SourcesDrawer'
