export const GamePhase = Object.freeze({
  READY: 'READY',
  WAVE_PREP: 'WAVE_PREP',
  WAVE_ACTIVE: 'WAVE_ACTIVE',
  WAVE_COMPLETE: 'WAVE_COMPLETE',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
  CRASHED: 'CRASHED'
});

export const GamePhaseTransitions = Object.freeze({
  [GamePhase.READY]: [GamePhase.WAVE_PREP],
  [GamePhase.WAVE_PREP]: [GamePhase.WAVE_ACTIVE, GamePhase.PAUSED, GamePhase.GAME_OVER],
  [GamePhase.WAVE_ACTIVE]: [GamePhase.WAVE_COMPLETE, GamePhase.PAUSED, GamePhase.GAME_OVER],
  [GamePhase.WAVE_COMPLETE]: [GamePhase.WAVE_PREP, GamePhase.WAVE_ACTIVE, GamePhase.PAUSED, GamePhase.GAME_OVER],
  [GamePhase.PAUSED]: [GamePhase.WAVE_PREP, GamePhase.WAVE_ACTIVE, GamePhase.WAVE_COMPLETE, GamePhase.GAME_OVER],
  [GamePhase.GAME_OVER]: [GamePhase.WAVE_PREP],
  [GamePhase.CRASHED]: [GamePhase.WAVE_PREP]
});
