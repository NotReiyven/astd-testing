import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-bold outline-none select-none cursor-pointer touch-manipulation disabled:pointer-events-none disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20 shadow-xs",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 border border-destructive/30 shadow-xs",
        outline:
          "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-xs",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[36px] px-4 py-2 text-[13px]",
        sm: "min-h-[30px] px-3 py-1.5 text-[12px] gap-1.5",
        lg: "min-h-[42px] px-6 py-2.5 text-[14px]",
        icon: "min-w-[36px] min-h-[36px] p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
