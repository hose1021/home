"use client"

import * as React from "react"
import {cn} from "@/lib/utils"

type TabsContextValue = { value: string; setValue: (v: string) => void }
const TabsContext = React.createContext<TabsContextValue | null>(null)

function Tabs({className, defaultValue, value: controlledValue, onValueChange, children, ...props}: React.ComponentProps<"div"> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const value = controlledValue ?? internalValue
  const setValue = React.useCallback((v: string) => {
    if (controlledValue === undefined) setInternalValue(v)
    onValueChange?.(v)
  }, [controlledValue, onValueChange])

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      className={cn(
        "flex h-10 w-full items-stretch justify-start gap-0 border-b border-border text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({className, value, ...props}: React.ComponentProps<"button"> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx?.value === value
  return (
    <button
      data-slot="tabs-trigger"
      data-state={isActive ? "active" : "inactive"}
      onClick={() => ctx?.setValue(value)}
      className={cn(
        "inline-flex h-10 flex-none items-center justify-center gap-1.5 px-4 text-sm font-bold whitespace-nowrap transition-colors",
        "hover:text-foreground data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_var(--brand)]",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({className, value, ...props}: React.ComponentProps<"div"> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  if (ctx?.value !== value) return null
  return (
    <div
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export {Tabs, TabsList, TabsTrigger, TabsContent}
