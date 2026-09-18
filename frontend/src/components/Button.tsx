import type { ButtonHTMLAttributes } from 'react'

export default function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex flex-1 max-w-32 aspect-square items-center justify-center text-center p-2! rounded-2xl bg-white text-[#2c2c2c] text-lg! font-bold! shadow-[0_4px_0_rgba(0,0,0,0.25)] disabled:opacity-55 disabled:cursor-default disabled:shadow-none disabled:translate-y-1 ${className}`.trim()}
      {...props}
    />
  )
}
