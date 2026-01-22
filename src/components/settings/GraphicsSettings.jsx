/**
 * GraphicsSettings - Graphics tab content with presets
 */

import SettingSlider from './SettingSlider';
import SettingToggle from './SettingToggle';
import SettingSelect from './SettingSelect';
import { GraphicsPresets, applyGraphicsPreset, detectGraphicsPreset } from '../../config/SettingsConfig';

export default function GraphicsSettings({ settings, onSettingChange, onBatchSettingChange }) {
  const handlePresetChange = (presetValue) => {
    if (presetValue === 'CUSTOM') {
      onSettingChange('graphicsPreset', 'CUSTOM');
      return;
    }

    const preset = GraphicsPresets[presetValue];
    if (preset && onBatchSettingChange) {
      onBatchSettingChange({
        ...preset,
        graphicsPreset: presetValue
      });
    } else {
      // Fallback: apply one by one
      onSettingChange('graphicsPreset', presetValue);
      if (preset) {
        Object.entries(preset).forEach(([key, value]) => {
          onSettingChange(key, value);
        });
      }
    }
  };

  // Auto-detect if current settings match a preset
  const handleIndividualChange = (key, value) => {
    onSettingChange(key, value);
    // After changing an individual setting, update preset to CUSTOM if it no longer matches
    const newSettings = { ...settings, [key]: value };
    const detected = detectGraphicsPreset(newSettings);
    if (detected !== settings.graphicsPreset) {
      onSettingChange('graphicsPreset', detected);
    }
  };

  return (
    <div className="space-y-2">
      <SettingSelect
        label="Quality Preset"
        value={settings.graphicsPreset}
        options={[
          { value: 'LOW', label: 'Low' },
          { value: 'MEDIUM', label: 'Medium' },
          { value: 'HIGH', label: 'High' },
          { value: 'CUSTOM', label: 'Custom' }
        ]}
        onChange={handlePresetChange}
        description="Quick quality preset"
      />

      <div className="border-t border-gray-700 pt-3 mt-3">
        <SettingSlider
          label="Particle Count"
          value={settings.particleCount}
          min={100}
          max={1000}
          step={100}
          onChange={(value) => handleIndividualChange('particleCount', value)}
          description="Maximum number of particles"
        />

        <SettingSelect
          label="Shadow Quality"
          value={settings.shadowQuality}
          options={[
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' }
          ]}
          onChange={(value) => handleIndividualChange('shadowQuality', value)}
          description="Shadow map resolution"
        />

        <SettingToggle
          label="Antialiasing"
          value={settings.antialiasing}
          onChange={(value) => handleIndividualChange('antialiasing', value)}
          description="Enable anti-aliasing (smoother edges)"
        />
      </div>

      <div className="border-t border-gray-700 pt-3 mt-3">
        <SettingToggle
          label="Show FPS"
          value={settings.showFps}
          onChange={(value) => onSettingChange('showFps', value)}
          description="Display frames per second counter"
        />

        <SettingToggle
          label="Show Performance HUD"
          value={settings.showPerfHud}
          onChange={(value) => onSettingChange('showPerfHud', value)}
          description="Display FPS, entities, and renderer stats"
        />

        <SettingSlider
          label="UI Scale"
          value={settings.uiScale ?? 1}
          min={0.85}
          max={1.3}
          step={0.05}
          onChange={(value) => onSettingChange('uiScale', value)}
          formatValue={(value) => `${Math.round(value * 100)}%`}
          description="Scale UI text and panels"
        />
      </div>
    </div>
  );
}
