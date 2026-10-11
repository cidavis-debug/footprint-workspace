import { createLink } from '@tanstack/react-router'
import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { buttonVariants, type ButtonProps } from '@/design-system/footprint-0a8b1a'

const ButtonAnchor = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & Pick<ButtonProps, 'variant' | 'size'>>(
  ({ variant, size, children, ...props }, ref) => <a {...props} ref={ref} className={buttonVariants({ variant, size })}>{children}</a>,
)

export const NavigationButton = createLink(ButtonAnchor)