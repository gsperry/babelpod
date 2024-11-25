import { ReactNode } from 'react';
import { Speaker, Save } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Device } from '../../types';
import { DeviceGroup } from './DeviceGroup';

interface OutputSectionProps {
  outputs: Device[];
  selectedOutputs: string[];
  volumes: Record<string, number>;
  mutedOutputs: string[];
  onOutputToggle: (deviceId: string) => void;
  onVolumeChange: (deviceId: string, values: number[]) => void;
  onMuteToggle: (deviceId: string) => void;
  onSavePreset: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  children?: ReactNode;
}

export function OutputSection({
  outputs,
  selectedOutputs,
  volumes,
  mutedOutputs,
  onOutputToggle,
  onVolumeChange,
  onMuteToggle,
  onSavePreset,
  searchTerm,
  onSearchChange,
  children
}: OutputSectionProps) {
  const filteredOutputs = outputs.filter(device => 
    device.id !== 'void' && 
    (device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     device.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedOutputs = filteredOutputs.reduce((groups, device) => {
    const type = device.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(device);
    return groups;
  }, {} as Record<string, Device[]>);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Speaker className="h-5 w-5" />
            <h2 className="font-medium">Output Devices</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSavePreset}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            <span>Save Preset</span>
          </Button>
        </div>

        {children}

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search devices..."
            className="w-full p-2 rounded-md border bg-background"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Grouped Outputs */}
        <div className="space-y-6">
          {Object.entries(groupedOutputs).map(([type, devices]) => (
            <DeviceGroup
              key={type}
              type={type}
              devices={devices}
              selectedOutputs={selectedOutputs}
              volumes={volumes}
              mutedOutputs={mutedOutputs}
              onOutputToggle={onOutputToggle}
              onVolumeChange={onVolumeChange}
              onMuteToggle={onMuteToggle}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}