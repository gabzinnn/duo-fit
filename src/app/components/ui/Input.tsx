import { InputHTMLAttributes, ReactNode } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Icon to display on the left side (non-clickable) */
  leftIcon?: ReactNode
  /** Icon to display on the right side (non-clickable) */
  rightIcon?: ReactNode
  /** Element to display on the left side (clickable) */
  leftElement?: ReactNode
  /** Element to display on the right side (clickable) */
  rightElement?: ReactNode
  /** Additional classes for the container div */
  containerClassName?: string
}

export function Input({
  leftIcon,
  rightIcon,
  leftElement,
  rightElement,
  containerClassName = "",
  className = "",
  ...props
}: InputProps) {
  const hasLeft = Boolean(leftIcon || leftElement)
  const hasRight = Boolean(rightIcon || rightElement)

  return (
    <div className={`relative flex items-center ${containerClassName}`}>
      {/* Left Icon (non-interactive) */}
      {leftIcon && (
        <div className="absolute left-4 flex items-center justify-center text-slate-400 pointer-events-none">
          {leftIcon}
        </div>
      )}

      {/* Left Element (interactive) */}
      {leftElement && (
        <div className="absolute left-4 flex items-center justify-center">
          {leftElement}
        </div>
      )}

      <input
        className={`
          w-full h-14 rounded-xl
          bg-slate-100 text-[#101519]
          border-none outline-none
          text-base placeholder:text-slate-400
          transition-all
          focus:ring-2 focus:ring-primary/50
          ${hasLeft ? "pl-12" : "pl-4"}
          ${hasRight ? "pr-12" : "pr-4"}
          ${className}
        `}
        {...props}
      />

      {/* Right Icon (non-interactive) */}
      {rightIcon && (
        <div className="absolute right-4 flex items-center justify-center text-slate-400 pointer-events-none">
          {rightIcon}
        </div>
      )}

      {/* Right Element (interactive) */}
      {rightElement && (
        <div className="absolute right-4 flex items-center justify-center">
          {rightElement}
        </div>
      )}
    </div>
  )
}
