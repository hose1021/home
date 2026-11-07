import type {WorkOrderStatus} from "@/core/db/schema/enums";

export const WORK_ORDER_TRANSITIONS: Readonly<Record<WorkOrderStatus, readonly WorkOrderStatus[]>> = {
  pending: ["approved", "cancelled"],
  approved: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: ["pending"],
};

/** Badge variant per status, shared by every work-order view. */
export const WORK_ORDER_TONE: Readonly<Record<WorkOrderStatus, "default" | "secondary" | "outline" | "destructive">> = {
  pending: "secondary",
  approved: "default",
  in_progress: "outline",
  completed: "default",
  cancelled: "destructive",
};

export function isValidWorkOrderTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return WORK_ORDER_TRANSITIONS[from].includes(to);
}
