/**
 * AudioSettings - Audio tab content
 */

import SettingSlider from './SettingSlider';
import SettingToggle from './SettingToggle';

export default function AudioSettings({ settings, onSettingChange }) {
  return (
    <div className="space-y-2">
      <SettingSlider
        label="Master Volume"
        value={settings.masterVolume}
        min={0}
        max={1}
        step={0.1}
        onChange={(value) => onSettingChange('masterVolume', value)}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        description="Overall game volume"
      />

      <SettingSlider
        label="SFX Volume"
        value={settings.sfxVolume}
        min={0}
        max={1}
        step={0.1}
        onChange={(value) => onSettingChange('sfxVolume', value)}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        description="Sound effects volume"
      />

      <SettingSlider
        label="Music Volume"
        value={settings.musicVolume}
        min={0}
        max={1}
        step={0.1}
        onChange={(value) => onSettingChange('musicVolume', value)}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        description="Background music volume"
      />

      <div className="border-t border-gray-700 pt-3 mt-3">
        <SettingToggle
          label="Mute All"
          value={settings.muted}
          onChange={(value) => onSettingChange('muted', value)}
          description="Mute all game audio"
        />
      </div>
    </div>
  );
}
