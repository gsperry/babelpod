import { Search } from 'lucide-react';

interface DeviceSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  className?: string;
}

export function DeviceSearch({ searchTerm, onSearchChange, className = '' }: DeviceSearchProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        placeholder="Search devices..."
        className="w-full p-2 pl-8 rounded-md border bg-background"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}