import { Speaker } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Device } from '../types';

interface OutputSelectorProps {
  outputs: Device[];
  selectedOutputs: string[];
  volumes: Record<string, number>;
  onOutputToggle: (deviceId: string) => void;
  onVolumeChange: (deviceId: string, volume: number) => void;
}

export function OutputSelector({
  outputs,
  selectedOutputs,
  volumes,
  onOutputToggle,
  onVolumeChange
}: OutputSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-sm text-zinc-400 px-1">OUTPUT ZONES</div>
      <div className="space-y-2">
        {outputs.map(output => (
          <div key={output.id} className="space-y-1">
            <Button
              variant="ghost"
              className={`w-full h-16 justify-between px-4 bg-zinc-900 border border-zinc-800
                ${selectedOutputs.includes(output.id) ? 'border-blue-500' : ''}
                hover:border-blue-500/50 transition-colors`}
              onClick={() => onOutputToggle(output.id)}
            >
              <div className="flex items-center gap-3">
                <Speaker className={`h-5 w-5 ${selectedOutputs.includes(output.id) ? 'text-blue-500' : 'text-zinc-400'}`} />
                <span className={`font-mono ${selectedOutputs.includes(output.id) ? 'text-white' : 'text-zinc-400'}`}>
                  {output.name}
                </span>
              </div>
              {selectedOutputs.includes(output.id) && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="font-mono text-sm text-blue-500">
                    {(volumes[output.id] || 0).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </Button>
            {selectedOutputs.includes(output.id) && (
              <div className="px-4 py-2 bg-zinc-900/50 rounded-md">
                <Slider
                  value={[volumes[output.id] || 0]}
                  onValueChange={([v]) => onVolumeChange(output.id, v)}
                  min={0}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}