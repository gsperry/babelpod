import { ReactNode } from 'react';
import { RefreshCw, Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';

interface LayoutProps {
  children: ReactNode;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onRefresh: () => void;
  connecting: boolean;
  error: string | null;
}

export function Layout({ 
  children, 
  isDarkMode, 
  toggleDarkMode, 
  onRefresh, 
  connecting, 
  error 
}: LayoutProps) {
  return (
    <div className={`min-h-screen bg-background p-4 md:p-6 ${isDarkMode ? 'dark' : ''}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">BabelPod</h1>
            {connecting && (
              <span className="text-sm text-muted-foreground animate-pulse">
                Connecting...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRefresh}
              disabled={connecting}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${connecting ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {children}
      </div>
    </div>
  );
}