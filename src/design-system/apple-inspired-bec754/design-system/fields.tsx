import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from './utils';
const field = 'w-full rounded-md border border-border bg-surface px-3 text-body text-foreground placeholder:text-subtle-foreground fp-transition focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/15 disabled:bg-disabled disabled:text-disabled-foreground disabled:cursor-not-allowed aria-invalid:border-destructive';
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> { size?: 'sm' | 'md' | 'lg'; }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, size = 'md', ...props }, ref) => <input ref={ref} className={cn(field, { sm: 'h-8', md: 'h-10', lg: 'h-12' }[size], className)} {...props} />);
Input.displayName = 'Input';
export interface SearchFieldProps extends InputProps {}
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(({ className, ...props }, ref) => <div className="relative w-full"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input ref={ref} type="search" className={cn('pl-9', className)} {...props} /></div>);
SearchField.displayName = 'SearchField';
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => <textarea ref={ref} className={cn(field, 'min-h-24 resize-y py-3', className)} {...props} />);
Textarea.displayName = 'Textarea';
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> { size?: 'sm' | 'md' | 'lg'; }
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, size = 'md', ...props }, ref) => <select ref={ref} className={cn(field, { sm: 'h-8', md: 'h-10', lg: 'h-12' }[size], className)} {...props} />);
Select.displayName = 'Select';