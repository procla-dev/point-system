import type { SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }

export default function Select({ className = '', wrapperClassName = '', ...props }: Props) {
  return (
    <span className={`relative inline-block ${wrapperClassName}`.trim()}>
      <select
        className={`flex h-full w-full items-center appearance-none border-b border-gray-500 bg-transparent p-1 pr-5 focus:outline-none ${className}`.trim()}
        {...props}
      />
      <svg
        className="pointer-events-none absolute top-1/2 right-1 h-3 w-3 -translate-y-1/2 text-gray-500"
        viewBox="0 0 12 8"
        fill="none"
        aria-hidden="true"
      >
        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
