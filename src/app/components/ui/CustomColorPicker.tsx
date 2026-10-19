import { useState, useEffect, useRef } from "react";
import { triggerHaptic } from "../../../data/helpers";

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return { h: 220, s: 70, l: 50 };
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export interface SwatchOption {
  label: string;
  hex: string;
}

interface CustomColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  presets: SwatchOption[];
  mode?: "foundation" | "accent";
}

export function CustomColorPicker({
  value,
  onChange,
  label,
  presets,
  mode = "foundation",
}: CustomColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const hsl = hexToHsl(value);
  const [hue, setHue] = useState(hsl.h);

  useEffect(() => {
    setHexInput(value.toUpperCase());
    const newHsl = hexToHsl(value);
    setHue(newHsl.h);
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const handleHexChange = (text: string) => {
    let clean = text.trim();
    if (!clean.startsWith("#")) clean = "#" + clean;
    setHexInput(clean);
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      triggerHaptic("light");
      onChange(clean.toUpperCase());
    }
  };

  const handleHueSlider = (h: number) => {
    setHue(h);
    // Keep current saturation & lightness or use a clean default based on mode
    const targetS = mode === "foundation" ? 25 : 85;
    const targetL = mode === "foundation" ? 14 : 58;
    const newHex = hslToHex(h, targetS, targetL);
    onChange(newHex);
  };

  const handleSelectShade = (l: number) => {
    triggerHaptic("light");
    const s = mode === "foundation" ? 28 : 85;
    const newHex = hslToHex(hue, s, l);
    onChange(newHex);
  };

  const hasEyeDropper =
    typeof window !== "undefined" && "EyeDropper" in window;

  const handleEyeDropper = async () => {
    if (!hasEyeDropper) return;
    try {
      triggerHaptic("medium");
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        onChange(result.sRGBHex.toUpperCase());
      }
    } catch {
      // User cancelled eyedropper
    }
  };

  const shades =
    mode === "foundation"
      ? [8, 14, 20, 28, 38]
      : [32, 45, 58, 70, 84];

  return (
    <div ref={containerRef} className="flex flex-col gap-2 relative">
      {label && (
        <span className="text-[12px] text-muted-foreground font-medium">
          {label}
        </span>
      )}

      {/* Preset Swatches Row + Custom Hex Trigger */}
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((sw) => {
          const isSelected =
            value.toLowerCase() === sw.hex.toLowerCase();
          return (
            <button
              key={sw.hex}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onChange(sw.hex.toUpperCase());
              }}
              title={sw.label}
              className={`w-7 h-7 rounded-[6px] border transition-[transform,box-shadow] duration-150 active:scale-90 cursor-pointer relative ${
                isSelected
                  ? "scale-110 ring-2 ring-white border-white shadow-md z-10"
                  : "border-[#35373c] hover:scale-105"
              }`}
              style={{ backgroundColor: sw.hex }}
            />
          );
        })}

        {/* Custom Hex Pill Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            setIsOpen((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[11.5px] font-mono transition-colors cursor-pointer select-none ${
            isOpen
              ? "bg-[#2b2d31] border-[#5865F2] text-foreground ring-1 ring-[#5865F2]/40"
              : "bg-[#1e1f22] border-[#35373c] text-foreground hover:bg-[#2b2d31]"
          }`}
          title="Open Custom Color Studio"
        >
          <span
            className="w-3.5 h-3.5 rounded-[3px] border border-black/40 shadow-xs shrink-0"
            style={{ backgroundColor: value }}
          />
          <span className="font-semibold">{value.toUpperCase()}</span>
          <svg
            viewBox="0 0 16 16"
            className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>

      {/* Custom Studio Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-[#18191c] border border-[#35373c] rounded-[8px] p-3.5 shadow-2xl flex flex-col gap-3 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#2b2d31]">
            <span className="text-[12px] font-bold text-foreground">
              Color Studio
            </span>
            <span className="text-[10.5px] font-mono text-muted-foreground">
              {mode === "foundation" ? "Dark Foundation" : "Vibrant Accent"}
            </span>
          </div>

          {/* Interactive Hue Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <label htmlFor="custom-color-hue-slider" className="cursor-pointer">
                Hue Spectrum
              </label>
              <span className="font-mono text-[10px]">{hue}°</span>
            </div>
            <input
              id="custom-color-hue-slider"
              name="hue_spectrum"
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={(e) => handleHueSlider(Number(e.target.value))}
              aria-label="Hue spectrum slider"
              className="w-full h-3 rounded-full appearance-none cursor-pointer outline-none"
              style={{
                background:
                  "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
              }}
            />
          </div>

          {/* Dynamic Lightness Shades */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              Shades & Tones
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {shades.map((l) => {
                const s = mode === "foundation" ? 28 : 85;
                const shadeHex = hslToHex(hue, s, l);
                const isActive =
                  value.toLowerCase() === shadeHex.toLowerCase();
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleSelectShade(l)}
                    className={`h-7 rounded-[4px] border transition-transform cursor-pointer relative ${
                      isActive
                        ? "ring-2 ring-white border-white scale-105"
                        : "border-[#35373c] hover:scale-105"
                    }`}
                    style={{ backgroundColor: shadeHex }}
                    title={`Lightness ${l}% (${shadeHex})`}
                  />
                );
              })}
            </div>
          </div>

          {/* Direct Hex Input + EyeDropper */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#2b2d31]">
            <div className="relative flex-1 flex items-center">
              <span
                className="w-4 h-4 rounded-[3px] border border-black/40 absolute left-2 pointer-events-none"
                style={{ backgroundColor: value }}
              />
              <input
                id="custom-color-hex-input"
                name="hex_color_code"
                type="text"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                maxLength={7}
                placeholder="#000000"
                aria-label="Hex color code"
                className="w-full bg-[#1e1f22] border border-[#35373c] focus:border-[#5865F2] rounded-[5px] pl-8 pr-2.5 py-1 text-[12px] font-mono text-foreground focus:outline-none"
              />
            </div>

            {hasEyeDropper && (
              <button
                type="button"
                onClick={handleEyeDropper}
                className="p-1.5 rounded-[5px] bg-[#1e1f22] hover:bg-[#2b2d31] border border-[#35373c] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Pick color from screen"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M13.5 2.5a1.414 1.414 0 0 0-2 0L9.5 4.5l2 2 2-2a1.414 1.414 0 0 0 0-2zM8.5 5.5l-6 6V14h2.5l6-6-2.5-2.5z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
