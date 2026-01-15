import { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant
  /** Size preset */
  size?: ButtonSize
  /** Icon to display on the left side */
  leftIcon?: ReactNode
  /** Icon to display on the right side (animates on hover) */
  rightIcon?: ReactNode
  /** Show loading spinner */
  isLoading?: boolean
  /** Make button full width */
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-primary text-[#101519] font-bold
    shadow-lg shadow-primary/25
    hover:bg-blue-300 hover:shadow-primary/40
    active:scale-[0.98]
  `,
  secondary: `
    bg-slate-100 text-slate-700
    hover:bg-slate-200
  `,
  ghost: `
    bg-transparent text-slate-500
    hover:text-primary hover:bg-slate-50
  `,
  danger: `
    bg-red-500 text-white font-bold
    shadow-lg shadow-red-500/25
    hover:bg-red-600 hover:shadow-red-500/40
    active:scale-[0.98]
  `,
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm rounded-lg gap-1.5",
  md: "h-12 px-6 text-base rounded-xl gap-2",
  lg: "h-14 px-8 text-lg rounded-full gap-2",
}

export function Button({
  variant = "primary",
  size = "lg",
  leftIcon,
  rightIcon,
  isLoading = false,
  fullWidth = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading

  return (
    <button
      className={`
        group inline-flex items-center justify-center
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <span className="material-symbols-outlined animate-spin text-xl">
          progress_activity
        </span>
      ) : (
        <>
          {leftIcon && (
            <span className="shrink-0 flex items-center">{leftIcon}</span>
          )}
          {children}
          {rightIcon && (
            <span className="shrink-0 flex items-center transition-transform group-hover:translate-x-1">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  )
}
