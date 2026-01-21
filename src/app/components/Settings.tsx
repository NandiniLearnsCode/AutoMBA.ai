import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Key, Save, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Separator } from "@/app/components/ui/separator";
import { Alert, AlertDescription } from "@/app/components/ui/alert";

interface SettingsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const API_KEY_STORAGE_KEY = "nexus_openai_api_key";

export function Settings({ open, onOpenChange }: SettingsProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  // Load existing API key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      setHasExistingKey(true);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      setIsSaved(true);
      setHasExistingKey(true);
      setTimeout(() => setIsSaved(false), 3000);
      
      // Notify the user that they may need to refresh or the change will take effect on next request
      window.dispatchEvent(new CustomEvent('apiKeyUpdated'));
    }
  };

  const handleClear = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey("");
    setHasExistingKey(false);
    setIsSaved(false);
    window.dispatchEvent(new CustomEvent('apiKeyUpdated'));
  };

  const maskedKey = apiKey ? `${apiKey.substring(0, 7)}${'*'.repeat(Math.max(0, apiKey.length - 11))}${apiKey.substring(apiKey.length - 4)}` : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Configure your API keys and preferences
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* API Key Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-4 h-4" />
                OpenAI API Key
              </CardTitle>
              <CardDescription>
                Enter your OpenAI API key to enable the chatbot. Your key is stored locally in your browser and never sent to our servers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasExistingKey && apiKey && (
                <Alert>
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    API key is configured. Key: {maskedKey}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-proj-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally in your browser's localStorage. It will be used instead of environment variables if provided.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!apiKey.trim()}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {hasExistingKey ? "Update" : "Save"} Key
                </Button>
                {hasExistingKey && (
                  <Button
                    onClick={handleClear}
                    variant="outline"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {isSaved && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    API key saved successfully! The change will take effect immediately.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About API Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                • Your API key is stored locally in your browser
              </p>
              <p>
                • The key is never transmitted to our servers
              </p>
              <p>
                • If you set a key here, it will be used instead of environment variables
              </p>
              <p>
                • You can get your API key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
