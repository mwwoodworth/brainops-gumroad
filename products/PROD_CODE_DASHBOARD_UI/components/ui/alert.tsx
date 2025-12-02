'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-gray-950 dark:[&>svg]:text-gray-50',
  {
    variants: {
      variant: {
        default: 'bg-white text-gray-950 border-gray-200 dark:bg-gray-950 dark:text-gray-50 dark:border-gray-800',
        destructive:
          'border-red-500/50 text-red-600 dark:border-red-500 [&>svg]:text-red-600 dark:text-red-400 dark:[&>svg]:text-red-400 bg-red-50 dark:bg-red-950/10',
        warning:
          'border-yellow-500/50 text-yellow-800 dark:border-yellow-500 [&>svg]:text-yellow-800 dark:text-yellow-400 dark:[&>svg]:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/10',
        success:
          'border-green-500/50 text-green-800 dark:border-green-500 [&>svg]:text-green-800 dark:text-green-400 dark:[&>svg]:text-green-400 bg-green-50 dark:bg-green-950/10',
        info:
          'border-blue-500/50 text-blue-800 dark:border-blue-500 [&>svg]:text-blue-800 dark:text-blue-400 dark:[&>svg]:text-blue-400 bg-blue-50 dark:bg-blue-950/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <h5
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
}
