export class WaveManager {
  constructor(state) {
    this.state = state;
    this.spawnedCounts = {};
  }

  reset() {
    this.spawnedCounts = {};
  }

  startWave(activeWaveNumber, endlessMode) {
    this.state.waveComp = this.getWaveComposition(activeWaveNumber, endlessMode);
    this.spawnedCounts = {};
    Object.keys(this.state.waveComp).forEach((key) => {
      this.spawnedCounts[key] = 0;
    });

    this.state.toSpawn = Object.values(this.state.waveComp).reduce((a, b) => a + b, 0);
    this.state.expectedThisWave = this.state.toSpawn;
    this.state.totalSpawnedThisWave = 0;
    this.state.spawnTimer = 1;
  }

  recordSpawn(type) {
    if (!this.spawnedCounts[type]) {
      this.spawnedCounts[type] = 0;
    }
    this.spawnedCounts[type] += 1;
    this.state.toSpawn -= 1;
    this.state.totalSpawnedThisWave += 1;
  }

  getNextSpawnType() {
    const comp = this.state.waveComp || {};
    const available = Object.entries(comp).filter(([type]) => this.spawnedCounts[type] < comp[type]);
    if (available.length === 0) return null;

    const weights = { STANDARD: 5, RUNNER: 3, TANK: 2, HEALER: 2, SPLITTER: 2, BOSS: 1 };
    const weighted = available.flatMap(([type]) => Array(weights[type] || 1).fill(type));
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  getWaveComposition(wave, endless) {
    const mult = endless ? 1.3 : 1;
    const isBossWave = wave >= 5 && wave % 5 === 0;
    const isBreatherWave = wave > 5 && wave % 5 === 1;
    const isBuildupWave = wave % 5 === 4;

    let rhythmMult = 1.0;
    if (isBossWave) rhythmMult = 0.6;
    else if (isBreatherWave) rhythmMult = 0.7;
    else if (isBuildupWave) rhythmMult = 1.2;

    const comp = {
      STANDARD: Math.max(3, Math.round((3 + wave * 0.8) * mult * rhythmMult)),
      RUNNER: 0,
      TANK: 0,
      HEALER: 0,
      SPLITTER: 0,
      BOSS: 0
    };

    if (wave >= 3) {
      const cap = endless ? 8 + Math.floor(wave * 0.15) : 6;
      comp.RUNNER = Math.round(Math.min(1 + (wave - 3) * 0.5, cap) * mult * rhythmMult);
    }

    if (wave >= 5) {
      const cap = endless ? 5 + Math.floor(wave * 0.1) : 4;
      comp.TANK = Math.round(Math.min(1 + (wave - 5) * 0.3, cap) * mult * rhythmMult);
    }

    if (wave >= 7) {
      const cap = endless ? 4 + Math.floor(wave * 0.08) : 3;
      comp.HEALER = Math.round(Math.min(1 + (wave - 7) * 0.25, cap) * mult * rhythmMult);
    }

    if (wave >= 8) {
      const cap = endless ? 3 + Math.floor(wave * 0.06) : 2;
      comp.SPLITTER = Math.round(Math.min(1 + (wave - 8) * 0.2, cap) * mult * rhythmMult);
    }

    if (isBossWave) {
      comp.BOSS = 1 + Math.floor((wave - 5) / 10);
    }

    return comp;
  }
}
