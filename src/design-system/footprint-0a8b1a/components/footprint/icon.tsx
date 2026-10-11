import * as React from 'react'
import { Sparkles, FilePlus2, Folder, ArrowUp, Plus, X, Search, FileText, Link2, MoreHorizontal, ChevronDown, Copy, Check, LoaderCircle, ArrowUpRight, Sun, Moon } from 'lucide-react'
import { cn } from '../../lib/utils'
export const iconCatalog={Sparkles,FilePlus2,Folder,ArrowUp,Plus,X,Search,FileText,Link2,MoreHorizontal,ChevronDown,Copy,Check,LoaderCircle,ArrowUpRight,Sun,Moon}
export interface IconProps extends React.SVGAttributes<SVGSVGElement> { name: keyof typeof iconCatalog; size?: 'sm'|'md'|'lg' }
export const Icon=React.forwardRef<SVGSVGElement,IconProps>(({name,size='md',className,...props},ref)=>{const Glyph=iconCatalog[name];return <Glyph ref={ref} aria-hidden="true" strokeWidth={1.5} className={cn({sm:'size-4',md:'fp-icon',lg:'size-6'}[size],className)} {...props}/>})
Icon.displayName='Icon'
