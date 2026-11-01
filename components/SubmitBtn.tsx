"use client"
import { useFormStatus } from "react-dom"

export default function SubmitBtn({
  children,
  pendingText,
  disabled,
  className,
  style,
  ...props
}: {
  children: React.ReactNode
  pendingText?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  [key: string]: any
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={className}
      style={style}
      {...props}
    >
      {pending ? (pendingText || "Please wait...") : children}
    </button>
  )
}
