"use client";

export interface DisplayParams {
  amax: number;
  amin: number;
  fmax: number;
  fmin: number;
  length: number;
  step: number;
  pmax: number;
  pmin: number;
}

function Row({ label, value, onDec, onInc }: {
  label: string; value: number; onDec: () => void; onInc: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500 w-16">{label}</span>
      <span className="text-sm font-mono text-gray-700 w-14 text-right">{value}</span>
      <div className="flex items-center gap-3 ml-2">
        <button onClick={onDec} className="text-red-400 hover:text-red-500 font-bold text-base leading-none select-none">−</button>
        <button onClick={onInc} className="text-red-400 hover:text-red-500 font-bold text-base leading-none select-none">+</button>
      </div>
    </div>
  );
}

interface Props {
  params: DisplayParams;
  onChange: (key: keyof DisplayParams, delta: number) => void;
  onAutoscale: () => void;
}

export function ParameterPanel({ params, onChange, onAutoscale }: Props) {
  return (
    <div className="w-56 border-r border-gray-200 px-4 py-3 flex flex-col bg-white">
      <Row label="amax" value={params.amax} onDec={() => onChange("amax", -5)} onInc={() => onChange("amax", 5)} />
      <Row label="amin" value={params.amin} onDec={() => onChange("amin", -5)} onInc={() => onChange("amin", 5)} />
      <Row label="fmax" value={params.fmax} onDec={() => onChange("fmax", -4)} onInc={() => onChange("fmax", 4)} />
      <Row label="fmin" value={params.fmin} onDec={() => onChange("fmin", -1)} onInc={() => onChange("fmin", 1)} />
      <Row label="length" value={params.length} onDec={() => onChange("length", -32)} onInc={() => onChange("length", 32)} />
      <Row label="step" value={params.step} onDec={() => onChange("step", -1)} onInc={() => onChange("step", 1)} />

      <div className="border-t border-gray-200 mt-3 pt-3" />

      <Row label="pmax" value={params.pmax} onDec={() => onChange("pmax", -5)} onInc={() => onChange("pmax", 5)} />
      <Row label="pmin" value={params.pmin} onDec={() => onChange("pmin", -1)} onInc={() => onChange("pmin", 1)} />

      <button
        onClick={onAutoscale}
        className="mt-4 w-full py-2 rounded bg-teal-400 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
      >
        Autoscale
      </button>
    </div>
  );
}
