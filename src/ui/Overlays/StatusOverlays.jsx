export function StatusOverlays({ banner, showStartWave, startWaveLabel, onStartWave }) {
  return (
    <>
      {banner && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className={`text-5xl font-black text-white text-center drop-shadow-lg animate-bounce ${banner.includes('BOSS') ? 'text-red-500' : banner.includes('Complete') ? 'text-green-400' : ''}`}
            style={{ textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(255,200,100,0.5)' }}
          >
            {banner}
          </div>
        </div>
      )}

      {showStartWave && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <button
            onClick={onStartWave}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold px-10 py-5 rounded-xl hover:scale-110 transition-all shadow-2xl animate-pulse"
          >
            {startWaveLabel}
          </button>
        </div>
      )}
    </>
  );
}
