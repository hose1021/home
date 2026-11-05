"use client";

import {Popover as PopoverPrimitive} from "@base-ui/react/popover";
import * as React from "react";

import {cn} from "@/lib/utils";

function Popover(props: PopoverPrimitive.Root.Props) {
    return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
    return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
    className,
    align = "start",
    sideOffset = 4,
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> & {
    align?: "start" | "center" | "end";
    sideOffset?: number;
}) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner align={align} sideOffset={sideOffset} className="z-50">
                <PopoverPrimitive.Popup
                    data-slot="popover-content"
                    className={cn(
                        "rounded-[4px] border border-border bg-popover text-popover-foreground shadow-[0_30px_70px_-40px_rgb(0_0_0/0.9)] outline-none",
                        className,
                    )}
                    {...props}
                />
            </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
    );
}

export {Popover, PopoverTrigger, PopoverContent};
