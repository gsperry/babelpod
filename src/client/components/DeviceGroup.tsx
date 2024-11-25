import { Bluetooth, Speaker, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Device } from '../../types';
import type { MouseEvent } from 'react';

interface DeviceGroupProps {
  type: string;
  devices: Device[];
  selectedOutputs: string[];
  volumes: Record<string, number>;
  mutedOutputs: string[];
  onOutputToggle: (deviceId: string) => void;
  onVolumeChange: (deviceId: string, values: number[]) => void;
  onMuteToggle: (deviceId: string) => void;
}

export function DeviceGroup({
  type,
  devices,
  selectedOutputs,
  volumes,
  mutedOutputs,
  onOutputToggle,
  onVolumeChange,
  onMuteToggle,
}: DeviceGroupProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {type === 'airplay' ? (
          <Bluetooth className="h-4 w-4 text-blue-500" />
        ) : (
          <Speaker className="h-4 w-4 text-green-500" />
        )}
        <h3 className="text-sm font-medium">
          {type.charAt(0).toUpperCase() + type.slice(1)} Devices
        </h3>
      </div>
      <div className="grid gap-4">
        {devices.map(device => (
          <div key={device.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant={selectedOutputs.includes(device.id) ? "default" : "outline"}
                className="flex-1 justify-between"
                onClick={() => onOutputToggle(device.id)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{device.name}</span>
                  <span className="text-sm opacity-70">{device.id}</span>
                </div>
                {selectedOutputs.includes(device.id) && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  onMuteToggle(device.id);
                }}
                className={mutedOutputs.includes(device.id) ? 'text-destructive' : ''}
              >
                {mutedOutputs.includes(device.id) ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Volume Control */}
            <div className="flex items-center gap-4 px-3">
              <Slider
                value={[volumes[device.id] || 0]}
                onValueChange={(values) => onVolumeChange(device.id, values)}
                min={0}
                max={100}
                step={1}
                disabled={!selectedOutputs.includes(device.id) || mutedOutputs.includes(device.id)}
                className="flex-1"
              />
              <span className="text-sm tabular-nums w-12 text-right">
                {mutedOutputs.includes(device.id) ? 'Muted' : `${volumes[device.id] || 0}%`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}