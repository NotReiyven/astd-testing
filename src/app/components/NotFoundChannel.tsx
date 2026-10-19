import { Compass, ArrowLeft, Calculator } from "lucide-react";

export function NotFoundChannel() {
  const handleGoToValueList = () => {
    window.dispatchEvent(
      new CustomEvent("navigate-channel", { detail: "value-list" })
    );
  };

  const handleOpenCalculator = () => {
    window.dispatchEvent(new CustomEvent("open-trade-analyzer"));
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-background min-h-[400px]">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-6 shadow-lg shadow-primary/5">
        <Compass className="w-8 h-8 animate-pulse" />
      </div>

      <span className="text-xs font-mono font-bold tracking-widest uppercase text-muted-foreground mb-2">
        Error 404
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-3">
        Channel Not Found
      </h1>

      <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
        The destination you are trying to reach doesn&apos;t exist or has moved. Return to the live market list or launch the trade calculator below.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleGoToValueList}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Live Value List
        </button>

        <button
          type="button"
          onClick={handleOpenCalculator}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold uppercase tracking-wider border border-border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
        >
          <Calculator className="w-4 h-4" />
          Trade Calculator
        </button>
      </div>
    </div>
  );
}
