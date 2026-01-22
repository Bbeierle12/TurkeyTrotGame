export function TurretMenu({ currency, turretTypes, onSelectTurret, onClose }) {
  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Turrets</h2>
          <div className="text-yellow-400 font-bold">{currency}</div>
        </div>
        <div className="space-y-3">
          {Object.entries(turretTypes).map(([key, turret]) => {
            const canAfford = currency >= turret.cost;
            return (
              <button
                key={key}
                onClick={() => {
                  if (canAfford) onSelectTurret(key);
                }}
                disabled={!canAfford}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${canAfford ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/50 opacity-50'}`}
              >
                <span className="text-3xl">{turret.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-bold">{turret.name}</div>
                  <div className="text-gray-400 text-sm">{turret.description}</div>
                  <div className="text-gray-500 text-xs">
                    DMG: {turret.damage} - Range: {turret.range} - Rate: {turret.fireRate}/s
                  </div>
                </div>
                <div className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>{turret.cost}</div>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition"
        >
          Close (T or ESC)
        </button>
      </div>
    </div>
  );
}
