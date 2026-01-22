export function PerformanceHud({ metrics, isVisible }) {
  if (!isVisible || !metrics) return null;

  const entities = metrics.entities ?? {};
  const renderer = metrics.renderer ?? {};

  return (
    <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur rounded-lg p-3 text-xs text-gray-200 font-mono space-y-1 pointer-events-none">
      <div className="text-amber-300 font-semibold">Perf</div>
      <div>FPS: {metrics.fps ?? '-'}</div>
      <div>Avg ms: {metrics.avgFrameTime ? metrics.avgFrameTime.toFixed(1) : '-'}</div>
      <div>Z: {entities.zombies ?? 0} T: {entities.turrets ?? 0} P: {entities.projectiles ?? 0}</div>
      <div>TP: {entities.turretProjectiles ?? 0}</div>
      {renderer && (
        <>
          <div>Geo: {renderer.geometries ?? 0} Tex: {renderer.textures ?? 0}</div>
          <div>Prog: {renderer.programs ?? 0} Calls: {renderer.drawCalls ?? 0}</div>
          <div>Tris: {renderer.triangles ?? 0}</div>
        </>
      )}
    </div>
  );
}
