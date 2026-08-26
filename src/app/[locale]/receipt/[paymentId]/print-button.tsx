"use client";

import {IconPrinter} from "@tabler/icons-react";
import {Button} from "@/components/ui/button";

export function PrintButton({label}: {label: string}) {
  return (
    <Button onClick={() => window.print()} className="gap-2">
      <IconPrinter className="size-4" />
      {label}
    </Button>
  );
}
