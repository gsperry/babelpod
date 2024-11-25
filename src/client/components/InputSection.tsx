import { Mic, Waves } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Device } from '../../types';

interface InputSectionProps {
  inputs: Device[];
  selectedInput: string;
  onInputChange: (deviceId: string) => void;
}

export function InputSection({ inputs, selectedInput, onInputChange }: InputSectionProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mic className="h-5 w-5" />
          <h2 className="font-medium">Input Source</h2>
        </div>
        <div className="grid gap-2">
          {inputs.map(device => (
            <button
              key={device.id}
              onClick={() => onInputChange(device.id)}
              className={`flex items-center p-3 rounded-lg transition-colors text-left
                ${selectedInput === device.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
                }`}
            >
              <div className="flex-1">
                <div className="font-medium">{device.name}</div>
                <div className="text-sm opacity-70">{device.id}</div>
              </div>
              {selectedInput === device.id && (
                <div className="flex items-center gap-2">
                  <Waves className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">Active</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}