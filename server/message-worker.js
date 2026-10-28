import { parentPort } from "node:worker_threads";

if (!parentPort) {
  throw new Error("This file must run as a Worker Thread.");
}

parentPort.on("message", ({ taskId, text, maxLength = 1000 }) => {
  try {
    // This runs in a separate worker thread, not on the Socket.IO main thread.
    const normalized = String(text ?? "").replace(/\s+/g, " ").trim();

    if (!normalized) {
      parentPort.postMessage({ taskId, ok: false, error: "Message cannot be empty." });
      return;
    }

    if (normalized.length > maxLength) {
      parentPort.postMessage({
        taskId,
        ok: false,
        error: `Messages must be ${maxLength} characters or fewer.`
      });
      return;
    }

    parentPort.postMessage({ taskId, ok: true, text: normalized });
  } catch {
    parentPort.postMessage({
      taskId,
      ok: false,
      error: "An unexpected message-processing error occurred."
    });
  }
});
