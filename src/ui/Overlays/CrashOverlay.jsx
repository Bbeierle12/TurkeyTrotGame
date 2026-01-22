export function CrashOverlay({ runtimeError, onReset, onReload }) {
  if (!runtimeError) return null;

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-3xl border border-red-700/60 max-h-[85vh] overflow-hidden flex flex-col">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Runtime Error</h2>
        <div className="text-gray-200 text-sm mb-3">
          The game hit an unexpected error. You can reset the run or reload.
        </div>
        {runtimeError.message && (
          <div className="text-red-300 text-sm mb-3">{runtimeError.message}</div>
        )}
        {(runtimeError.stack || runtimeError.error?.stack) && (
          <pre className="text-xs text-gray-300 bg-black/60 rounded-lg p-3 overflow-auto mb-3 whitespace-pre-wrap">
            {runtimeError.stack || runtimeError.error?.stack}
          </pre>
        )}
        {runtimeError.context && (
          <pre className="text-xs text-gray-400 bg-black/40 rounded-lg p-3 overflow-auto mb-4 whitespace-pre-wrap">
            {JSON.stringify(runtimeError.context, null, 2)}
          </pre>
        )}
        <div className="flex flex-wrap gap-3 mt-auto">
          <button
            onClick={onReset}
            className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-500 transition font-bold"
          >
            Reset Run
          </button>
          <button
            onClick={onReload}
            className="bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
