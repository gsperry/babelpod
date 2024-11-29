import { Mic, Bluetooth } from 'lucide-react';
import { Button } from './ui/button';
import { Device } from '../types';

interface InputSelectorProps {
  inputs: Device[];
  selectedInput: string;
  onInputChange: (deviceId: string) => void;
}

export function InputSelector({ inputs, selectedInput, onInputChange }: InputSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-sm text-zinc-400 px-1">INPUT SOURCE</div>
      <div className="grid grid-cols-2 gap-2">
        {inputs.map(input => (
          <Button
            key={input.id}
            variant="ghost"
            className={`h-20 flex flex-col items-center justify-center gap-2 bg-zinc-900 border border-zinc-800
              ${selectedInput === input.id ? 'border-blue-500 text-blue-500' : 'text-zinc-400'}
              hover:border-blue-500/50 hover:text-blue-500/50 transition-colors`}
            onClick={() => onInputChange(input.id)}
          >
            {input.type === 'bluetooth' ? (
              <Bluetooth className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
            <span className="font-mono text-sm">{input.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}