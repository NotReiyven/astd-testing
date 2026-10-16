import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { triggerHaptic } from "../../../data/helpers";

const IconCheck = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconChevronDown = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  portalRef: React.RefObject<HTMLElement | null> | null,
  handler: () => void
) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (ref.current && ref.current.contains(target)) return;
      if (portalRef?.current && portalRef.current.contains(target)) return;
      handlerRef.current?.();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, portalRef]);
}

export interface CustomDropdownProps {
  icon: React.ComponentType<any>;
  value: string;
  options: Record<string, string>;
  onChange: (val: string) => void;
  defaultLabel?: string;
  className?: string;
}

export function CustomDropdown({
  icon: Icon,
  value,
  options,
  onChange,
  defaultLabel,
  className = "",
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const optionKeys = Object.keys(options);

  useClickOutside(ref, portalRef, () => setIsOpen(false));

  const handleToggle = () => {
    triggerHaptic("light");
    if (!isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
      setFocusedIndex(optionKeys.indexOf(value));
    }
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        handleToggle();
      }
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % optionKeys.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(
        (prev) => (prev - 1 + optionKeys.length) % optionKeys.length
      );
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0) {
        triggerHaptic("medium");
        onChange(optionKeys[focusedIndex]);
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
  };

  const activeDescendant =
    isOpen && focusedIndex >= 0
      ? `dropdown-opt-${optionKeys[focusedIndex]}`
      : undefined;

  return (
    <div
      ref={ref}
      className={`relative w-full ${className}`}
    >
      <button
        ref={buttonRef}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "custom-dropdown-list" : undefined}
        aria-activedescendant={activeDescendant}
        className="w-full flex items-center justify-between bg-popover hover:bg-muted rounded-[4px] border border-border px-3 h-[34px] sm:h-[32px] transition-all shadow-inner whitespace-nowrap active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center min-w-0 pointer-events-none flex-1 pr-1">
          <Icon
            className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0"
            aria-hidden="true"
          />
          <span className="text-[12.5px] sm:text-[13px] font-bold text-foreground px-0.5 truncate leading-none">
            {value === "all" && defaultLabel ? defaultLabel : options[value]}
          </span>
        </div>
        <IconChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground ml-2 shrink-0 opacity-70 transition-transform duration-200 pointer-events-none ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={portalRef}
            id="custom-dropdown-list"
            role="listbox"
            className="absolute bg-popover border border-border rounded-[6px] shadow-[0_10px_30px_rgba(0,0,0,0.6)] z-[100] py-1.5 flex flex-col animate-slide-up max-h-[300px] overflow-y-auto custom-scrollbar"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            {optionKeys.map((k, i) => (
              <div
                key={k}
                id={`dropdown-opt-${k}`}
                role="option"
                aria-selected={value === k}
                onClick={() => {
                  triggerHaptic("medium");
                  onChange(k);
                  setIsOpen(false);
                  buttonRef.current?.focus();
                }}
                onMouseEnter={() => setFocusedIndex(i)}
                className={`flex items-center justify-between text-left px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                  value === k || focusedIndex === i
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="truncate pr-4 pointer-events-none">
                  {options[k]}
                </span>
                {value === k && (
                  <IconCheck className="w-4 h-4 shrink-0 pointer-events-none" />
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
