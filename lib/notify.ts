import { toast } from "sonner";

/* Pop-up messages for every action: one success line, or the reason it failed. */

function reason(err: unknown): string | undefined {
  if (!err) return undefined;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return undefined;
}

export const notify = {
  success: (message: string, description?: string) => toast.success(message, { description }),
  error: (message: string, err?: unknown) => toast.error(message, { description: reason(err) }),
  info: (message: string, description?: string) => toast(message, { description }),
};
