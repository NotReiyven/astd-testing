import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { GiTrashCan, GiSpinningBlades } from "react-icons/gi";
import { useAuthStore } from "../../../store/useAuthStore";
import { triggerHaptic } from "../../../data/helpers";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

const CONFIRMATION_TARGET = "delete my account";

export function DeleteAccountModal({
  isOpen,
  onClose,
  username,
}: DeleteAccountModalProps) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const isConfirmed =
    confirmationInput.trim().toLowerCase() === CONFIRMATION_TARGET;

  // Focus management & Escape listener
  useEffect(() => {
    if (!isOpen) {
      setConfirmationInput("");
      setErrorMessage(null);
      setIsDeleting(false);
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        e.preventDefault();
        onClose();
      }

      // Basic tab loop focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex="0"]'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;

    triggerHaptic("heavy");
    setIsDeleting(true);
    setErrorMessage(null);

    const result = await deleteAccount(confirmationInput.trim());

    if (!result.success) {
      setIsDeleting(false);
      setErrorMessage(
        result.error || "Failed to delete account. Please try again."
      );
    } else {
      setIsDeleting(false);
      onClose();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      aria-describedby="delete-account-desc"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 select-none"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-card border border-border rounded-[10px] shadow-xl overflow-hidden flex flex-col text-foreground animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-destructive/10">
          <div className="flex items-center gap-2.5 text-destructive">
            <GiTrashCan className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2
              id="delete-account-title"
              className="text-[15px] font-bold tracking-tight text-foreground"
            >
              Delete Account
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close delete account dialog"
            className="w-7 h-7 rounded-[5px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="text-[16px] leading-none">&times;</span>
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleDelete} className="p-5 flex flex-col gap-4">
          <div id="delete-account-desc" className="flex flex-col gap-2 text-[12.5px] text-muted-foreground leading-relaxed">
            <p>
              This action is permanent and cannot be undone. You are deleting the account for{" "}
              <strong className="text-foreground font-semibold">{username}</strong>.
            </p>
            <div className="p-3 bg-muted/60 border border-border rounded-[6px] text-[12px] flex flex-col gap-1.5 text-foreground/90">
              <span className="font-semibold text-destructive">
                The following data will be erased:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>All active and archived trading ads</li>
                <li>All comments and comment votes</li>
                <li>Your inventory vault items and wishlist</li>
                <li>Profile customization, banner, and bio</li>
                <li>Authentication record and session credentials</li>
              </ul>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-[6px] bg-destructive/15 border border-destructive/30 text-destructive text-[12px] flex items-center gap-2"
            >
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirmation-input"
              className="text-[12px] text-foreground font-medium"
            >
              To confirm, type <span className="font-mono font-bold text-destructive select-all">delete my account</span> below:
            </label>
            <input
              id="confirmation-input"
              name="account_deletion_confirmation"
              ref={inputRef}
              type="text"
              autoComplete="off"
              spellCheck="false"
              disabled={isDeleting}
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="delete my account"
              className="w-full px-3 py-2 text-base sm:text-[13px] bg-background border border-border rounded-[6px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-destructive focus:ring-1 focus:ring-destructive font-mono transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-3.5 py-2 text-[12.5px] rounded-[6px] border border-border bg-popover hover:bg-muted text-foreground transition-colors cursor-pointer font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className={`px-4 py-2 text-[12.5px] rounded-[6px] text-white font-medium flex items-center gap-2 transition-colors shadow-xs ${
                isConfirmed && !isDeleting
                  ? "bg-red-600 hover:bg-red-700 active:bg-red-800 border border-red-700 cursor-pointer"
                  : "bg-red-600/40 border border-red-600/30 text-white/50 cursor-not-allowed"
              }`}
            >
              {isDeleting && (
                <GiSpinningBlades
                  className="w-3.5 h-3.5 animate-spin shrink-0"
                  aria-hidden="true"
                />
              )}
              <span>{isDeleting ? "Deleting..." : "Permanently Delete Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
