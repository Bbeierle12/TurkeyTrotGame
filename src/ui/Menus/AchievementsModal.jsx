export function AchievementsModal({ achievements, unlockedAchievements, onClose }) {
  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 border border-gray-700 max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4">
          Achievements ({unlockedAchievements.length}/{Object.keys(achievements).length})
        </h2>
        <div className="space-y-2 overflow-y-auto flex-1">
          {Object.entries(achievements).map(([key, ach]) => {
            const unlocked = unlockedAchievements.includes(key);
            return (
              <div key={key} className={`flex items-center gap-3 p-3 rounded-xl ${unlocked ? 'bg-yellow-900/30' : 'bg-gray-800/50'}`}>
                <span className={`text-3xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{ach.icon}</span>
                <div className="flex-1">
                  <div className={`font-bold ${unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>{ach.name}</div>
                  <div className={`text-sm ${unlocked ? 'text-gray-300' : 'text-gray-600'}`}>{ach.description}</div>
                </div>
                {unlocked && <span className="text-green-400">✓</span>}
              </div>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
