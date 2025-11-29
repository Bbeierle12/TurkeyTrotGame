/**
 * SettingsModal - Main settings modal with tab navigation
 */

import { useState, useEffect, useCallback } from 'react';
import SettingsTabs from './SettingsTabs';
import ControlsSettings from './ControlsSettings';
import CameraSettings from './CameraSettings';
import GraphicsSettings from './GraphicsSettings';
import AudioSettings from './AudioSettings';
import { getDefaultSettings } from '../../config/SettingsConfig';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingChange,
  onBatchSettingChange,
  onPlaySound
}) {
  const [activeTab, setActiveTab] = useState('controls');

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    onPlaySound?.('click');
  };

  const handleClose = () => {
    onClose();
    onPlaySound?.('click');
  };

  const handleResetToDefaults = () => {
    const defaults = getDefaultSettings();
    if (onBatchSettingChange) {
      onBatchSettingChange(defaults);
    } else {
      Object.entries(defaults).forEach(([key, value]) => {
        onSettingChange(key, value);
      });
    }
    onPlaySound?.('click');
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
      <div className="bg-gray-900 rounded-2xl p-4 max-w-lg w-full mx-4 border border-gray-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-2 min-h-0">
          {activeTab === 'controls' && (
            <ControlsSettings
              settings={settings}
              onSettingChange={onSettingChange}
            />
          )}
          {activeTab === 'camera' && (
            <CameraSettings
              settings={settings}
              onSettingChange={onSettingChange}
            />
          )}
          {activeTab === 'graphics' && (
            <GraphicsSettings
              settings={settings}
              onSettingChange={onSettingChange}
              onBatchSettingChange={onBatchSettingChange}
            />
          )}
          {activeTab === 'audio' && (
            <AudioSettings
              settings={settings}
              onSettingChange={onSettingChange}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-700">
          <button
            onClick={handleResetToDefaults}
            className="flex-1 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition text-sm"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleClose}
            className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-500 transition text-sm"
          >
            Close (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
