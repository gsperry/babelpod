import { Volume2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Slider } from './ui/slider';

interface MasterVolumeProps {
  volume: number;
  onVolumeChange: (values: number[]) => void;
}

export function MasterVolume({ volume, onVolumeChange }: MasterVolumeProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-blue-500" />
              <span className="font-mono text-sm text-zinc-400">MASTER</span>
            </div>
            <span className="font-mono text-xl text-blue-500">
              {volume.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-150"
              style={{ width: `${volume}%` }}
            />
          </div>
          <Slider
            value={[volume]}
            onValueChange={onVolumeChange}
            min={0}
            max={100}
            step={1}
            className="pt-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}