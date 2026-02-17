import { describe, it, expect } from "vitest";
import { resolveDueDate } from "@/lib/due-date-resolver";

describe("resolveDueDate", () => {
  const company = { default_due_days: 30 };

  it("uses invoice-level due date when provided (highest priority)", () => {
    const result = resolveDueDate(
      { due_date: "2025-04-15", invoice_date: "2025-03-01" },
      { default_due_days: 45 },
      company
    );
    expect(result).toEqual({ due_date: "2025-04-15", source: "invoice" });
  });

  it("uses customer default_due_days when no invoice due date", () => {
    const result = resolveDueDate(
      { due_date: "", invoice_date: "2025-03-01" },
      { default_due_days: 45 },
      company
    );
    expect(result).toEqual({ due_date: "2025-04-15", source: "customer" });
  });

  it("falls back to company default when no invoice or customer due date", () => {
    const result = resolveDueDate(
      { due_date: "", invoice_date: "2025-03-01" },
      { default_due_days: undefined },
      company
    );
    expect(result).toEqual({ due_date: "2025-03-31", source: "company" });
  });

  it("ignores customer due days of 0", () => {
    const result = resolveDueDate(
      { due_date: "", invoice_date: "2025-03-01" },
      { default_due_days: 0 },
      company
    );
    expect(result).toEqual({ due_date: "2025-03-31", source: "company" });
  });
});
