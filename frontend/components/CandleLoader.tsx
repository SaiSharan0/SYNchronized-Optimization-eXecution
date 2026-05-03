import React from "react";

type CandleLoaderProps = {
  label?: string;
  compact?: boolean;
  className?: string;
};

export default function CandleLoader({
  label = "Loading market data...",
  compact = false,
  className = "",
}: CandleLoaderProps) {
  return (
    <div className={`candle-loader-wrap ${compact ? "compact" : ""} ${className}`}>
      <div className="candle-loader" aria-hidden="true">
        <div className="candle green">
          <span className="wick" />
          <span className="body" />
        </div>
        <div className="candle red">
          <span className="wick" />
          <span className="body" />
        </div>
      </div>
      {label ? <p className="candle-loader-label">{label}</p> : null}
    </div>
  );
}
