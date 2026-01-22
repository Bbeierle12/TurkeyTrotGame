export function ActionBar({
  weaponTypes,
  weapon,
  onSelectWeapon,
  onOpenTurretMenu,
  onOpenShop,
  placingTurretName
}) {
  const weaponKeys = Object.keys(weaponTypes);

  return (
    <>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {weaponKeys.map((key, index) => {
          const wp = weaponTypes[key];
          const isActive = weapon.name === wp.name;
          return (
            <button
              key={key}
              onClick={() => onSelectWeapon(key)}
              className={`relative bg-black/70 backdrop-blur rounded-xl p-3 transition-all ${isActive ? 'ring-2 ring-yellow-400 scale-110 bg-black/90' : 'hover:bg-black/80'}`}
            >
              <div className="text-2xl">{wp.icon}</div>
              <div className={`text-xs ${isActive ? 'text-yellow-400' : 'text-gray-400'}`}>{index + 1}</div>
              {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />}
            </button>
          );
        })}
        <div className="w-px bg-gray-600 mx-1" />
        <button
          onClick={onOpenTurretMenu}
          className="bg-black/70 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition"
        >
          <div className="text-2xl">🗼</div>
          <div className="text-xs text-gray-400">T</div>
        </button>
        <button
          onClick={onOpenShop}
          className="bg-black/70 backdrop-blur rounded-xl p-3 hover:bg-black/80 transition"
        >
          <div className="text-2xl">🛒</div>
          <div className="text-xs text-gray-400">B</div>
        </button>
      </div>

      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-center pointer-events-none">
        <div className="text-white font-bold">{weapon.name}</div>
        <div className="text-gray-400 text-xs">{weapon.description}</div>
      </div>

      {placingTurretName && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-green-600/80 backdrop-blur rounded-lg px-4 py-2 text-white text-sm">
          Click to place {placingTurretName} - Right-click or ESC to cancel
        </div>
      )}
    </>
  );
}
