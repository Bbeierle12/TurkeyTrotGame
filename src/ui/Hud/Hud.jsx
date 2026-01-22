export function Hud({
  health,
  lowHealth,
  houseIntegrity,
  currency,
  isInside,
  activeWaveNumber,
  endlessMode,
  enemies,
  score,
  showFps,
  fps,
  cameraMode,
  hitMarker,
  onCycleCamera,
  onScreenshot,
  onOpenHelp,
  onOpenSettings
}) {
  return (
    <>
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-black/60 backdrop-blur rounded-xl p-4 space-y-3 pointer-events-auto min-w-[200px]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❤️</span>
            <div className="flex-1">
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${lowHealth ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>
            <span className="text-white font-bold min-w-[3rem] text-right">{health}%</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <div className="flex-1">
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${houseIntegrity < 25 ? 'bg-red-500' : houseIntegrity < 50 ? 'bg-orange-500' : 'bg-amber-600'}`}
                  style={{ width: `${houseIntegrity}%` }}
                />
              </div>
            </div>
            <span className="text-white text-sm min-w-[3rem] text-right">{houseIntegrity}%</span>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-gray-700">
            <span className="text-2xl">🌽</span>
            <span className="text-yellow-400 font-bold text-xl">{currency}</span>
            <span className="text-yellow-600 text-sm">corn</span>
            {isInside && (
              <span className="ml-auto text-green-400 text-xs font-bold bg-green-900/50 px-2 py-0.5 rounded">
                INSIDE
              </span>
            )}
          </div>
        </div>

        <div className="bg-black/60 backdrop-blur rounded-xl px-6 py-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-orange-400 font-bold text-lg">Wave {activeWaveNumber}</span>
            {endlessMode && <span className="text-purple-400 text-sm">♾️</span>}
          </div>
          <div className="text-gray-400 text-sm">🧟 {enemies} remaining</div>
          <div className="text-white text-sm">⭐ {score}</div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          {showFps && (
            <div className="bg-black/60 backdrop-blur rounded-xl px-3 py-2 text-green-400 text-sm">
              {fps} FPS
            </div>
          )}
          <button
            onClick={onCycleCamera}
            className="bg-black/60 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition"
            title="Change Camera (C)"
          >
            <span>📷</span>
          </button>
          <button
            onClick={onScreenshot}
            className="bg-black/60 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition"
            title="Screenshot"
          >
            <span>🖼️</span>
          </button>
          <button
            onClick={onOpenHelp}
            className="bg-black/60 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition"
            title="Help"
          >
            ❓
          </button>
          <button
            onClick={onOpenSettings}
            className="bg-black/60 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {hitMarker && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className={`text-4xl ${hitMarker === 'kill' ? 'text-red-500' : 'text-white'}`}>✕</div>
        </div>
      )}

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/40 rounded-lg px-3 py-1 text-gray-400 text-xs pointer-events-none">
        {cameraMode} (C to change)
      </div>
    </>
  );
}
