import { useState } from 'react';
import { Music2, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { MasterVolume } from './MasterVolume';
import { InputSection } from './InputSection';
import { OutputSection } from './OutputSection';
import { PresetManager } from './PresetManager';
import { useSocket, useDevices, useDeviceControl } from './SocketProvider';

export function EnhancedLayout() {
  // Socket state from existing App.tsx
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

  // New state for enhanced UI
  const [activeView, setActiveView] = useState<'main' | 'settings'>('main');
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);
  const [latency] = useState(20); // In a real app, this would come from actual measurements
  const [searchTerm, setSearchTerm] = useState('');
  const [mutedOutputs, setMutedOutputs] = useState<string[]>([]);
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

  const handleRefresh = () => {
    setShowConnectionAlert(true);
    // Add your refresh logic here
    setTimeout(() => setShowConnectionAlert(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Music2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">BabelPod</h1>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">Latency: {latency}ms</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveView(activeView === 'main' ? 'settings' : 'main')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Connection Alert */}
        {showConnectionAlert && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Scanning for audio devices on your network...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Master Volume */}
        <MasterVolume
          volume={masterVolume}
          onVolumeChange={handleMasterVolumeChange}
        />

        {/* Main Content */}
        <div className="space-y-6">
          <InputSection
            inputs={inputs}
            selectedInput={selectedInput}
            onInputChange={switchInput}
          />

          <OutputSection
            outputs={outputs}
            selectedOutputs={selectedOutputs}
            volumes={volumes}
            mutedOutputs={mutedOutputs}
            onOutputToggle={(deviceId) => {
              const newOutputs = selectedOutputs.includes(deviceId)
                ? selectedOutputs.filter(id => id !== deviceId)
                : [...selectedOutputs, deviceId];
              switchOutputs(newOutputs);
            }}
            onVolumeChange={(deviceId, values) => changeVolume(deviceId, values[0])}
            onMuteToggle={(deviceId) => {
              setMutedOutputs(prev =>
                prev.includes(deviceId)
                  ? prev.filter(id => id !== deviceId)
                  : [...prev, deviceId]
              );
            }}
            onSavePreset={() => {
              // Add your preset saving logic here
            }}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          >
            <PresetManager
              presets={[]} // Add your presets here
              onPresetApply={() => {
                // Add your preset application logic here
              }}
            />
          </OutputSection>
        </div>
      </div>
    </div>
  );
}