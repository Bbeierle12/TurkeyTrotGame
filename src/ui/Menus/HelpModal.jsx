export function HelpModal({ controls = [], abilities = [], onClose }) {
  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 border border-gray-700 max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">How to Play</h2>
        <div className="space-y-4 text-gray-300">
          <div>
            <h3 className="text-yellow-400 font-bold mb-1">Objective</h3>
            <p>Survive the zombie horde! Hide in your house for protection, but they can break in!</p>
          </div>
          <div>
            <h3 className="text-yellow-400 font-bold mb-1">Controls</h3>
            <div className="text-sm space-y-1">
              {controls.map((control) => (
                <p key={`${control.key}-${control.label}`}>
                  <span className="text-white">{control.key}</span> - {control.label}
                </p>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-yellow-400 font-bold mb-1">Abilities</h3>
            <div className="text-sm space-y-1">
              {abilities.map((ability) => (
                <p key={`${ability.key}-${ability.label}`}>
                  <span className="text-white">{ability.key} - {ability.label}</span> - {ability.description}
                </p>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-6 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
