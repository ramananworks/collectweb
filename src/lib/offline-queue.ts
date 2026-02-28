import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUEUE_KEY = "offline_mutation_queue";

export type OfflineMutation = {
  id: string;
  table: string;
  type: "insert" | "update" | "delete";
  payload: Record<string, any>;
  timestamp: number;
};

function readQueue(): OfflineMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineMutation[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueMutation(mutation: Omit<OfflineMutation, "id" | "timestamp">) {
  const queue = readQueue();
  queue.push({
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  writeQueue(queue);
}

export function getQueueLength(): number {
  return readQueue().length;
}

export async function replayQueue(): Promise<{ succeeded: number; failed: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const remaining: OfflineMutation[] = [];

  for (const mutation of queue) {
    try {
      let error: any = null;
      // Use `as any` to bypass strict table-name typing for dynamic replay
      const table = (supabase as any).from(mutation.table);

      if (mutation.type === "insert") {
        const res = await table.insert(mutation.payload);
        error = res.error;
      } else if (mutation.type === "update") {
        const { id, ...rest } = mutation.payload;
        const res = await table.update(rest).eq("id", id);
        error = res.error;
      } else if (mutation.type === "delete") {
        const res = await table.delete().eq("id", mutation.payload.id);
        error = res.error;
      }

      if (error) {
        console.error("Replay failed for mutation:", mutation.id, error);
        remaining.push(mutation);
        failed++;
      } else {
        succeeded++;
      }
      }
    } catch (err) {
      console.error("Replay exception for mutation:", mutation.id, err);
      remaining.push(mutation);
      failed++;
    }
  }

  writeQueue(remaining);
  return { succeeded, failed };
}
