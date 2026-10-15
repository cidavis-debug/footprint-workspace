import { createLink } from '@tanstack/react-router'
import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { buttonVariants, type ButtonProps } from '@/design-system/apple-inspired-bec754/design-system/button'

const ButtonAnchor = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & Pick<ButtonProps, 'variant' | 'size'>>(
  ({ variant, size, children, ...props }, ref) => <a {...props} ref={ref} className={buttonVariants({ variant, size })}>{children}</a>,
)

export const NavigationButton = createLink(ButtonAnchor)