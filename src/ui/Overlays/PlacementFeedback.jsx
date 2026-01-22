export function PlacementFeedback({ feedback, cursor, isVisible, uiScale = 1 }) {
  if (!isVisible || !feedback || feedback.ok || !cursor) return null;

  const message = feedback.reasons?.[0]?.message || 'Invalid placement';
  const scale = uiScale || 1;
  const style = {
    left: `${Math.max(0, cursor.x / scale + 12)}px`,
    top: `${Math.max(0, cursor.y / scale + 12)}px`
  };

  return (
    <div className="absolute z-40 pointer-events-none" style={style}>
      <div className="bg-red-600/90 text-white text-xs font-semibold px-2 py-1 rounded shadow-lg">
        {message}
      </div>
    </div>
  );
}
