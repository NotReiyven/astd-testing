import { useState, useRef, useCallback, useEffect } from "react";
import { useToastStore, ToastAction } from "../store/useToastStore";
import { MOTION_DURATION_MS } from "../lib/motionTokens";

export type AsyncActionStatus = "idle" | "loading" | "success" | "error";

export interface UseAsyncActionOptions<TArgs extends unknown[], TResult> {
  /** If set, shows a persistent loading toast that updates on completion/error. */
  loadingMessage?: string;
  /** Toast message shown on success (can be a static string or derived from result). */
  successMessage?: string | ((result: TResult, ...args: TArgs) => string | null);
  /** Toast message shown on error (can be a static string or derived from error). */
  errorMessage?: string | ((error: Error, ...args: TArgs) => string);
  /** Optional Undo or custom action attached to the success toast. */
  successAction?: ToastAction | ((result: TResult, ...args: TArgs) => ToastAction | undefined);
  /** If true, attaches a "Retry" button to the error toast that re-invokes the action with the same arguments. */
  retryable?: boolean;
  /** Optional callback after success. */
  onSuccess?: (result: TResult, ...args: TArgs) => void;
  /** Optional callback after error. */
  onError?: (error: Error, ...args: TArgs) => void;
}

export function useAsyncAction<TArgs extends unknown[], TResult>(
  actionFn: (...args: TArgs) => Promise<TResult>,
  options?: UseAsyncActionOptions<TArgs, TResult>
) {
  const addToast = useToastStore((s) => s.addToast);
  const updateToast = useToastStore((s) => s.updateToast);

  const [status, setStatus] = useState<AsyncActionStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const inFlightRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setStatus("idle");
    setError(null);
  }, []);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      setStatus("loading");
      setError(null);

      const toastId = options?.loadingMessage
        ? addToast(options.loadingMessage, "loading")
        : null;

      try {
        const result = await actionFn(...args);

        if (mountedRef.current) {
          setStatus("success");
          resetTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setStatus("idle");
            }
          }, MOTION_DURATION_MS.statusReset);
        }

        const resolvedSuccessMsg =
          typeof options?.successMessage === "function"
            ? options.successMessage(result, ...args)
            : options?.successMessage;

        const resolvedAction =
          typeof options?.successAction === "function"
            ? options.successAction(result, ...args)
            : options?.successAction;

        if (toastId) {
          if (resolvedSuccessMsg) {
            updateToast(toastId, {
              message: resolvedSuccessMsg,
              type: "success",
              action: resolvedAction,
            });
          } else {
            useToastStore.getState().removeToast(toastId);
          }
        } else if (resolvedSuccessMsg) {
          addToast(resolvedSuccessMsg, "success", {
            action: resolvedAction,
          });
        }

        options?.onSuccess?.(result, ...args);
        return result;
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(String(err ?? "Unknown error"));

        if (mountedRef.current) {
          setStatus("error");
          setError(normalizedError);
        }

        const resolvedErrorMsg =
          typeof options?.errorMessage === "function"
            ? options.errorMessage(normalizedError, ...args)
            : (options?.errorMessage ?? normalizedError.message);

        const retryAction: ToastAction | undefined = options?.retryable
          ? {
              label: "Retry",
              onClick: () => {
                void execute(...args);
              },
            }
          : undefined;

        if (toastId) {
          updateToast(toastId, {
            message: resolvedErrorMsg,
            type: "error",
            action: retryAction,
          });
        } else if (options?.errorMessage !== undefined || options?.retryable) {
          addToast(resolvedErrorMsg, "error", {
            action: retryAction,
          });
        }

        options?.onError?.(normalizedError, ...args);
        return undefined;
      } finally {
        inFlightRef.current = false;
      }
    },
    [actionFn, options, addToast, updateToast]
  );

  return {
    execute,
    isLoading: status === "loading",
    status,
    error,
    reset,
  };
}
