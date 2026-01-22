export function StartScreen({
  highScore,
  playerStats,
  unlockedCount,
  achievementCount,
  controlsHint,
  onStartGame,
  onOpenAchievements
}) {
  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
      <div className="text-6xl mb-4">🧟🏠🔱</div>
      <h1 className="text-5xl font-black text-white mb-2" style={{ textShadow: '0 0 20px rgba(100,150,255,0.8)' }}>
        Homestead Siege
      </h1>
      <p className="text-gray-400 mb-4 text-lg">Defend your barn from the zombie horde!</p>

      <div className="bg-black/50 rounded-xl px-6 py-3 mb-6 flex gap-6 text-sm">
        <div className="text-center">
          <div className="text-yellow-400 font-bold text-xl">{highScore}</div>
          <div className="text-gray-500">High Score</div>
        </div>
        <div className="text-center">
          <div className="text-orange-400 font-bold text-xl">{playerStats.highestWave}</div>
          <div className="text-gray-500">Best Wave</div>
        </div>
        <div className="text-center">
          <div className="text-red-400 font-bold text-xl">{playerStats.totalKills}</div>
          <div className="text-gray-500">Total Kills</div>
        </div>
        <div className="text-center">
          <div className="text-purple-400 font-bold text-xl">{playerStats.gamesPlayed}</div>
          <div className="text-gray-500">Games</div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => onStartGame(false)}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xl font-bold px-10 py-4 rounded-xl hover:scale-105 transition shadow-lg"
        >
          Normal Mode
        </button>
        <button
          onClick={() => onStartGame(true)}
          className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xl font-bold px-10 py-4 rounded-xl hover:scale-105 transition shadow-lg"
        >
          Endless Mode
        </button>
      </div>

      <div className="text-gray-500 text-sm mb-4">
        {controlsHint}
      </div>
      <div className="flex gap-4">
        <button
          onClick={onOpenAchievements}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
        >
          Achievements ({unlockedCount}/{achievementCount})
        </button>
      </div>
    </div>
  );
}
