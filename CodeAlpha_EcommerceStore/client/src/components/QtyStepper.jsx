export default function QtyStepper({ value, min = 1, max, onChange, disabled }) {
  const current = Number(value) || min;
  const ceiling = max == null ? current + 1 : max;

  return (
    <div className="stepper">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || current <= min}
        onClick={() => onChange(Math.max(min, current - 1))}
      >
        −
      </button>
      <span>{current}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || current >= ceiling}
        onClick={() => onChange(Math.min(ceiling, current + 1))}
      >
        +
      </button>
    </div>
  );
}
