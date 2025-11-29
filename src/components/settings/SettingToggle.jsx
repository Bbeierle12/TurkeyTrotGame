/**
 * SettingToggle - Reusable toggle/switch control for settings
 */

export default function SettingToggle({
  label,
  value,
  onChange,
  description
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-white text-sm">{label}</span>
          {description && (
            <p className="text-gray-500 text-xs mt-0.5">{description}</p>
          )}
        </div>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
            value ? 'bg-amber-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
              value ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}