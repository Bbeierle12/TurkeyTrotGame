/**
 * SettingSelect - Reusable dropdown/select control for settings
 */

export default function SettingSelect({
  label,
  value,
  options,
  onChange,
  description
}) {
  return (
    <div className="mb-4">
      <label className="text-white text-sm block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-amber-500 focus:outline-none cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && (
        <p className="text-gray-500 text-xs mt-1">{description}</p>
      )}
    </div>
  );
}