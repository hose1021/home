"use client";

import type {ReactNode} from "react";
import {toast} from "sonner";

/**
 * View-as is read-only. The server rejects every mutation; this guard stops the common form
 * path before the request so the user gets the real reason instead of the production error digest.
 */
export function ReadOnlyGuard({active, message, children}: {active: boolean; message: string; children: ReactNode}) {
  if (!active) return <>{children}</>;

  function blockSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    toast.error(message);
  }

  function blockClick(event: React.MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('form [type="submit"]')) return;
    event.preventDefault();
    event.stopPropagation();
    toast.error(message);
  }

  return (
    <div data-read-only onSubmitCapture={blockSubmit} onClickCapture={blockClick}>
      {children}
    </div>
  );
}
