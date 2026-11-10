// ================================================
// FILE: src/app/components/ProfileChannel/ToggleSwitch.tsx
// ================================================

export function ToggleSwitch({
  checked,
  onChange,
  activeClassName = "bg-primary",
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  activeClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
        checked ? activeClassName : "bg-muted border border-border"
      }`}
    >
      <div
        className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}