/**
 * ControlsSettings - Controls tab content
 */

import SettingSlider from './SettingSlider';
import SettingToggle from './SettingToggle';

export default function ControlsSettings({ settings, onSettingChange }) {
  return (
    <div className="space-y-2">
      <SettingSlider
        label="Player Speed"
        value={settings.playerSpeed}
        min={4}
        max={16}
        step={1}
        onChange={(value) => onSettingChange('playerSpeed', value)}
        description="How fast the player moves"
      />

      <SettingSlider
        label="Mouse Sensitivity"
        value={settings.mouseSensitivity}
        min={0.2}
        max={3.0}
        step={0.1}
        onChange={(value) => onSettingChange('mouseSensitivity', value)}
        formatValue={(v) => v.toFixed(1)}
        description="First-person look sensitivity"
      />

      <SettingToggle
        label="Camera-Relative Movement"
        value={settings.cameraRelativeMovement}
        onChange={(value) => onSettingChange('cameraRelativeMovement', value)}
        description="WASD moves relative to camera direction (recommended)"
      />

      <SettingToggle
        label="Invert Y-Axis"
        value={settings.invertY}
        onChange={(value) => onSettingChange('invertY', value)}
        description="Invert vertical mouse movement"
      />

      <SettingToggle
        label="Invert X-Axis"
        value={settings.invertX}
        onChange={(value) => onSettingChange('invertX', value)}
        description="Invert horizontal mouse movement"
      />

      <SettingSlider
        label="Screen Shake"
        value={settings.screenShake}
        min={0}
        max={2.0}
        step={0.1}
        onChange={(value) => onSettingChange('screenShake', value)}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        description="Camera shake intensity when firing"
      />
    </div>
  );
}
