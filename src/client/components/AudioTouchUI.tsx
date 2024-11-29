import { useState } from 'react';
import { Volume2, Mic, Speaker, Bluetooth, RefreshCw, Power } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Alert, AlertDescription } from './ui/alert';
import { useSocket, useDevices, useDeviceControl } from './SocketProvider';
import { MasterVolume } from './MasterVolume';
import { InputSelector } from './InputSelector';
import { OutputSelector } from './OutputSelector';

export function AudioTouchUI() {
  const { isConnected, error } = useSocket();
  const { inputs, outputs } = useDevices();
  const {
    selectedInput,
    selectedOutputs,
    volumes,
    switchInput,
    switchOutputs,
    changeVolume,
  } = useDeviceControl();

  const [power, setPower] = useState(true);
  const [masterVolume, setMasterVolume] = useState(100);

  const handleMasterVolumeChange = (newVolume: number[]) => {
    const ratio = newVolume[0] / masterVolume;
    setMasterVolume(newVolume[0]);
    
    Object.entries(volumes).forEach(([deviceId, volume]) => {
      if (selectedOutputs.includes(deviceId)) {
        const newOutputVolume = Math.min(Math.round(volume * ratio), 100);
        changeVolume(deviceId, newOutputVolume);
      }
    });
  };

  return (
    <div className={`min-h-screen bg-black text-white ${!power ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
      {/* Top Control Bar */}
      <div className="px-4 py-3 bg-black border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-zinc-700'}`} />
            <h1 className="font-mono text-lg tracking-wider">BABELPOD</h1>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              onClick={() => setPower(!power)}
            >
              <Power className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className="p-4 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <MasterVolume
          volume={masterVolume}
          onVolumeChange={handleMasterVolumeChange}
        />

        <InputSelector
          inputs={inputs}
          selectedInput={selectedInput}
          onInputChange={switchInput}
        />

        <OutputSelector
          outputs={outputs}
          selectedOutputs={selectedOutputs}
          volumes={volumes}
          onOutputToggle={(deviceId) => {
            const newOutputs = selectedOutputs.includes(deviceId)
              ? selectedOutputs.filter(id => id !== deviceId)
              : [...selectedOutputs, deviceId];
            switchOutputs(newOutputs);
          }}
          onVolumeChange={(deviceId, value) => changeVolume(deviceId, value)}
        />
      </div>
    </div>
  );
}