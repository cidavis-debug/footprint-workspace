import * as React from 'react'
import { FileText, Link2, MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Badge } from './badge'
export interface SourceItemProps extends React.HTMLAttributes<HTMLDivElement> { name: string; kind?: 'file'|'link'; status?: 'indexed'|'processing'|'reference'; onAction?: ()=>void }
export const SourceItem = React.forwardRef<HTMLDivElement,SourceItemProps>(({name,kind='file',status='indexed',onAction,className,...props},ref)=><div ref={ref} className={cn('flex items-center gap-3 border-b py-3',className)} {...props}>{kind==='file'?<FileText className="fp-icon shrink-0 text-primary"/>:<Link2 className="fp-icon shrink-0 text-primary"/>}<span className="min-w-0 flex-1 truncate text-sm">{name}</span><Badge variant={status}>{status==='indexed'?'Indexed':status==='processing'?'Processing':'Reference only'}</Badge>{onAction&&<Button variant="ghost" size="sm" aria-label={`Options for ${name}`} title={`Options for ${name}`} onClick={onAction}><MoreHorizontal/></Button>}</div>)
SourceItem.displayName='SourceItem'
