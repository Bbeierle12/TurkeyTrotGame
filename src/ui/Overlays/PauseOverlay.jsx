export function PauseOverlay({ isVisible, onResume, onOpenSettings, onOpenHelp, onQuitToMenu }) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
      <div className="text-5xl font-black text-white mb-8">PAUSED</div>
      <div className="space-y-3">
        <button
          onClick={onResume}
          className="block w-48 bg-green-600 text-white py-3 rounded-lg hover:bg-green-500 transition text-lg font-bold"
        >
          Resume
        </button>
        <button
          onClick={onOpenSettings}
          className="block w-48 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-500 transition text-lg"
        >
          Settings
        </button>
        <button
          onClick={onOpenHelp}
          className="block w-48 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-500 transition text-lg"
        >
          Help
        </button>
        <button
          onClick={onQuitToMenu}
          className="block w-48 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition text-lg"
        >
          Quit to Menu
        </button>
      </div>
    </div>
  );
}
