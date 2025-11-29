/**
 * SettingsTabs - Tab bar for settings categories
 */

const tabs = [
  { id: 'controls', label: 'Controls', icon: '🎮' },
  { id: 'camera', label: 'Camera', icon: '📷' },
  { id: 'graphics', label: 'Graphics', icon: '🖥️' },
  { id: 'audio', label: 'Audio', icon: '🔊' }
];

export default function SettingsTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex border-b border-gray-700 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-2 px-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span className="mr-1">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
