import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      closeButton
      duration={3500}
      swipeDirections={['right', 'left', 'top', 'bottom']}
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-600" />,
        info: <InfoIcon className="size-4 text-blue-600" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600" />,
        error: <OctagonXIcon className="size-4 text-rose-600" />,
        loading: <Loader2Icon className="size-4 animate-spin text-blue-600" />,
        close: <XIcon className="size-4 text-slate-500 hover:text-slate-900 stroke-[2.25]" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200/90 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans group-[.toaster]:pr-14',
          title: 'group-[.toast]:text-xs group-[.toast]:font-semibold group-[.toast]:text-slate-900',
          description: 'group-[.toast]:text-[11px] group-[.toast]:text-slate-500 group-[.toast]:leading-normal',
          closeButton:
            '!opacity-100 !bg-white hover:!bg-slate-100 !text-slate-500 hover:!text-slate-900 !border !border-slate-200/90 !shadow-2xs transition-all duration-150 cursor-pointer !w-8 !h-8 active:!scale-90',
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
