import { useState, useEffect } from 'react';
import { Volume2, RefreshCw, Mic, Speaker } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Device } from '../types';
import type { MouseEvent } from 'react';

export default function App() {
  const [inputs, setInputs] = useState<Device[]>([]);
  const [outputs, setOutputs] = useState<Device[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('void');
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>(['void']);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate async device loading with potential error
    const loadDevices = async () => {
      try {
        setConnecting(true);
        // In real implementation, this would be a WebSocket connection
        const mockDevices = {
          inputs: [
            { id: 'void', name: 'None', type: 'void' as const },
            { id: 'plughw:1,0', name: 'Built-in Microphone', type: 'pcm' as const }
          ],
          outputs: [
            { id: 'void', name: 'None', type: 'void' as const },
            { id: 'plughw:0,0', name: 'Built-in Speakers', type: 'pcm' as const },
            { id: 'airplay_192.168.1.100_5000', name: 'Living Room AirPlay', type: 'airplay' as const }
          ]
        };

        // Simulate random error for demonstration
        if (Math.random() < 0.2) { // 20% chance of error
          throw new Error('Failed to connect to audio server');
        }

        setInputs(mockDevices.inputs);
        setOutputs(mockDevices.outputs);
        setVolumes({
          'plughw:0,0': 50,
          'airplay_192.168.1.100_5000': 75
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load devices');
      } finally {
        setConnecting(false);
      }
    };

    loadDevices();
  }, []);

  const handleInputChange = (deviceId: string) => {
    try {
      setSelectedInput(deviceId);
      // In real implementation, this would be a socket emit
      // Simulate potential error
      if (Math.random() < 0.1) { // 10% chance of error
        throw new Error(`Failed to switch to input: ${deviceId}`);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch input');
    }
  };

  const handleOutputToggle = (deviceId: string) => {
    try {
      setSelectedOutputs(prev => {
        if (prev.includes(deviceId)) {
          return prev.filter(id => id !== deviceId);
        }
        return [...prev, deviceId];
      });
      // Simulate potential error
      if (Math.random() < 0.1) { // 10% chance of error
        throw new Error(`Failed to toggle output: ${deviceId}`);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle output');
    }
  };

  const handleVolumeChange = (deviceId: string, newVolume: number) => {
    try {
      setVolumes(prev => ({ ...prev, [deviceId]: newVolume }));
      // Simulate potential error
      if (Math.random() < 0.05) { // 5% chance of error
        throw new Error(`Failed to set volume for: ${deviceId}`);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set volume');
    }
  };

  const refreshDevices = async () => {
    try {
      setConnecting(true);
      // Simulate refresh delay and potential error
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (Math.random() < 0.2) { // 20% chance of error
        throw new Error('Failed to refresh devices');
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh devices');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">BabelPod</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={refreshDevices}
          disabled={connecting}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${connecting ? 'animate-spin' : ''}`} />
          Refresh Devices
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Input Device
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {inputs.map(device => (
              <div
                key={device.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors
                  ${selectedInput === device.id 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted/50 border-border'
                  }`}
                onClick={() => handleInputChange(device.id)}
              >
                <div className="font-medium">{device.name}</div>
                <div className="text-sm text-muted-foreground">{device.id}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Speaker className="h-5 w-5" />
            Output Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {outputs.map(device => (
              <div
                key={device.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors
                  ${selectedOutputs.includes(device.id)
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted/50 border-border'
                  }`}
                onClick={() => handleOutputToggle(device.id)}
              >
                <div className="font-medium">{device.name}</div>
                <div className="text-sm text-muted-foreground">{device.id}</div>
                {device.id !== 'void' && selectedOutputs.includes(device.id) && (
                  <div className="mt-4 flex items-center gap-3">
                    <Volume2 className="h-4 w-4 shrink-0" />
                    <Slider
                      value={[volumes[device.id] || 0]}
                      onValueChange={(values: number[]) => handleVolumeChange(device.id, values[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                      onClick={(e: MouseEvent) => e.stopPropagation()}
                    />
                    <span className="w-12 text-right text-sm">
                      {volumes[device.id] || 0}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}