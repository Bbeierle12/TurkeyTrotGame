export function GameOverOverlay({
  isVisible,
  score,
  highScore,
  activeWaveNumber,
  endlessMode,
  onRestart,
  onOpenAchievements,
  onMainMenu
}) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40">
      <div className="text-6xl mb-4">💀🧟</div>
      <h1 className="text-5xl font-black text-red-500 mb-2">GAME OVER</h1>
      {score >= highScore && score > 0 && (
        <div className="text-2xl text-yellow-400 font-bold mb-2 animate-pulse">NEW HIGH SCORE!</div>
      )}
      <div className="text-3xl text-white mb-2">Score: {score}</div>
      {highScore > 0 && score < highScore && (
        <div className="text-lg text-gray-500 mb-2">High Score: {highScore}</div>
      )}
      <div className="text-xl text-gray-400 mb-2">Wave {activeWaveNumber} {endlessMode && '(Endless)'}</div>
      <div className="space-y-3 mt-6">
        <button
          onClick={onRestart}
          className="block w-48 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg hover:scale-105 transition text-lg font-bold"
        >
          Play Again
        </button>
        <button
          onClick={onOpenAchievements}
          className="block w-48 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-500 transition"
        >
          Achievements
        </button>
        <button
          onClick={onMainMenu}
          className="block w-48 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition"
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
