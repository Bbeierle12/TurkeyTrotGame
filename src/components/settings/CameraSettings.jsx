/**
 * CameraSettings - Camera tab content
 */

import SettingSlider from './SettingSlider';

export default function CameraSettings({ settings, onSettingChange }) {
  return (
    <div className="space-y-2">
      <SettingSlider
        label="Zoom Sensitivity"
        value={settings.zoomSensitivity}
        min={0.2}
        max={3.0}
        step={0.1}
        onChange={(value) => onSettingChange('zoomSensitivity', value)}
        formatValue={(v) => v.toFixed(1)}
        description="Scroll wheel zoom speed"
      />

      <SettingSlider
        label="Min Zoom"
        value={settings.zoomMin}
        min={0.3}
        max={0.8}
        step={0.1}
        onChange={(value) => onSettingChange('zoomMin', value)}
        formatValue={(v) => v.toFixed(1)}
        description="Closest zoom level"
      />

      <SettingSlider
        label="Max Zoom"
        value={settings.zoomMax}
        min={1.5}
        max={3.0}
        step={0.1}
        onChange={(value) => onSettingChange('zoomMax', value)}
        formatValue={(v) => v.toFixed(1)}
        description="Farthest zoom level"
      />

      <SettingSlider
        label="Pan Speed"
        value={settings.panSpeed}
        min={10}
        max={40}
        step={5}
        onChange={(value) => onSettingChange('panSpeed', value)}
        description="Arrow key camera pan speed"
      />

      <SettingSlider
        label="Camera Smoothing"
        value={settings.cameraSmoothing}
        min={0.05}
        max={0.3}
        step={0.05}
        onChange={(value) => onSettingChange('cameraSmoothing', value)}
        formatValue={(v) => v.toFixed(2)}
        description="Camera follow smoothness (lower = smoother)"
      />

      <SettingSlider
        label="Field of View"
        value={settings.fov}
        min={40}
        max={90}
        step={5}
        onChange={(value) => onSettingChange('fov', value)}
        formatValue={(v) => `${v}°`}
        description="Camera field of view angle"
      />
    </div>
  );
}
