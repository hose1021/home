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
      <div data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props}>
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
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1",
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
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:outline-ring focus-visible:ring-[3px] inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color] data-[state=active]:shadow-sm",
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
