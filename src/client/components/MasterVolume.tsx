import { Volume2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Slider } from './ui/slider';

interface MasterVolumeProps {
  volume: number;
  onVolumeChange: (values: number[]) => void;
}

export function MasterVolume({ volume, onVolumeChange }: MasterVolumeProps) {
  return (
    <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-none shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Volume2 className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">Master Volume</h2>
            <div className="flex items-center gap-4">
              <Slider
                value={[volume]}
                onValueChange={onVolumeChange}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12 text-right">
                {volume}%
              </span>
            </div>
          </div>
        </div>

        {/* Volume Visualization */}
        <div className="grid grid-cols-12 gap-1 h-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-sm ${
                (i + 1) * 8.33 <= volume
                  ? 'bg-gradient-to-t from-blue-500 to-purple-500 animate-pulse'
                  : 'bg-gray-200 dark:bg-gray-800'
              }`}
              style={{
                height: `${Math.min(100, Math.max(20, Math.random() * 100))}%`,
                transition: 'all 0.2s ease-in-out'
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}