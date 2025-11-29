/**
 * SettingSlider - Reusable slider control for settings
 */

export default function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  description,
  formatValue
}) {
  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-white text-sm">{label}</label>
        <span className="text-gray-400 text-sm">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
      {description && (
        <p className="text-gray-500 text-xs mt-1">{description}</p>
      )}
    </div>
  );
}