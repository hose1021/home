import {useRender} from "@base-ui/react/use-render";
import {cva, type VariantProps} from "class-variance-authority";
import * as React from "react";

import {cn} from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5 items-center justify-center gap-1 rounded-[4px] border border-transparent px-1.5 text-[11px] font-bold leading-[14px] tracking-[0.6px] uppercase whitespace-nowrap w-fit shrink-0 overflow-hidden shadow-[inset_0_0_0_1px_rgb(255_255_255/0.24)] transition-colors [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-white dark:text-[#111218]",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-[var(--danger-solid)] text-white",
        outline: "bg-transparent text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]",
        admin: "bg-[var(--danger-solid)] text-white",
        management_member: "bg-primary text-white dark:text-[#111218]",
        commandant: "bg-gold text-white dark:text-[#111218]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  render = <span />,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { render?: useRender.RenderProp }) {
  return useRender({
    render,
    props: {
      "data-slot": "badge",
      className: cn(badgeVariants({ variant }), className),
      ...props,
    },
  });
}

export { Badge, badgeVariants };
