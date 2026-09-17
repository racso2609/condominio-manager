import { Expense } from "@/lib/types";

export interface ExpenseCancellationInfo {
  isCancelled: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  reason?: string | null;
}

/**
 * Checks whether an expense has been cancelled or eliminated.
 * Supports both native database columns (status === "cancelled" or deleted_at)
 * and the graceful description fallback ([ANULADO: ...]).
 */
export function isExpenseCancelled(expense?: Expense | null): boolean {
  if (!expense) return false;
  if (expense.status === "cancelled") return true;
  if (Boolean(expense.deleted_at)) return true;
  if (typeof expense.description === "string" && expense.description.startsWith("[ANULADO")) {
    return true;
  }
  return false;
}

/**
 * Extracts cancellation audit metadata (timestamp, author, reason) from an expense.
 */
export function getExpenseCancellationInfo(
  expense?: Expense | null
): ExpenseCancellationInfo {
  if (!expense) return { isCancelled: false };

  if (expense.status === "cancelled" || Boolean(expense.deleted_at)) {
    return {
      isCancelled: true,
      deletedAt: expense.deleted_at ?? null,
      deletedBy: expense.deleted_by ?? null,
      reason: expense.delete_reason ?? null,
    };
  }

  if (typeof expense.description === "string" && expense.description.startsWith("[ANULADO")) {
    const match = expense.description.match(
      /^\[ANULADO:\s*([^|]*?)\s*\|\s*por:\s*([^|]*?)\s*\|\s*motivo:\s*([^\]]*?)\]/i
    );
    if (match) {
      return {
        isCancelled: true,
        deletedAt: match[1]?.trim() || null,
        deletedBy: match[2]?.trim() || null,
        reason: match[3]?.trim() || null,
      };
    }
    return {
      isCancelled: true,
      deletedAt: null,
      deletedBy: null,
      reason: null,
    };
  }

  return { isCancelled: false };
}

/**
 * Returns the clean description without the fallback cancellation header.
 */
export function getCleanExpenseDescription(description?: string | null): string {
  if (!description) return "";
  return description.replace(/^\[ANULADO:[^\]]*\]\s*/i, "").trim();
}
