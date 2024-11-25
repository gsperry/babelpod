import { Button } from './ui/button';

interface AudioPreset {
  name: string;
  outputs: string[];
  volumes: Record<string, number>;
}

interface PresetManagerProps {
  presets: AudioPreset[];
  onPresetApply: (preset: AudioPreset) => void;
}

export function PresetManager({ presets, onPresetApply }: PresetManagerProps) {
  if (presets.length === 0) return null;

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
      {presets.map((preset, index) => (
        <Button
          key={index}
          variant="secondary"
          size="sm"
          onClick={() => onPresetApply(preset)}
        >
          {preset.name}
        </Button>
      ))}
    </div>
  );
}

// Types for use in other components
export interface CreatePresetOptions {
  name?: string;
  outputs: string[];
  volumes: Record<string, number>;
}

export function createPreset(options: CreatePresetOptions, existingPresets: AudioPreset[]): AudioPreset {
  const presetName = options.name || `Preset ${existingPresets.length + 1}`;
  
  return {
    name: presetName,
    outputs: options.outputs,
    volumes: options.volumes
  };
}