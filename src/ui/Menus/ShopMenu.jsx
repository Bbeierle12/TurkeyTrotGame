export function ShopMenu({ currency, shopItems, onClose }) {
  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Shop</h2>
          <div className="text-yellow-400 font-bold">{currency}</div>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {shopItems.map((item) => {
            const canAfford = currency >= item.cost;
            const maxed = item.max !== undefined && item.current >= item.max;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (canAfford && !maxed) item.action();
                }}
                disabled={!canAfford || maxed}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${maxed ? 'bg-gray-800 opacity-50' : canAfford ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/50 opacity-50'}`}
              >
                <span className="text-3xl">{item.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-bold">{item.name}</div>
                  <div className="text-gray-400 text-sm">{item.desc}</div>
                </div>
                <div className={`font-bold ${maxed ? 'text-green-400' : canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                  {maxed ? 'MAX' : item.cost}
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition"
        >
          Close (B or ESC)
        </button>
      </div>
    </div>
  );
}
