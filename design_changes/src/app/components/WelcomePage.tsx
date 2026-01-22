import { useState } from "react";
import { Brain, Key, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card } from "@/app/components/ui/card";

interface WelcomePageProps {
  onLogin: (openaiKey: string, googleCredentials: string) => void;
}

export function WelcomePage({ onLogin }: WelcomePageProps) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [googleCredentials, setGoogleCredentials] = useState("");

  const handleLogin = () => {
    if (openaiKey && googleCredentials) {
      onLogin(openaiKey, googleCredentials);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-4">
            <Brain className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Kaisey</h1>
          <p className="text-muted-foreground">
            Your AI-powered MBA Co-Pilot for Academic Excellence, Professional Networking, and Personal Well-being
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-4 rounded-lg bg-muted/50">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs font-semibold">AI Insights</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
              <Brain className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-xs font-semibold">Smart Scheduling</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <LogIn className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-xs font-semibold">Integrations</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="openai-key" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              OpenAI API Key
            </Label>
            <Input
              id="openai-key"
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                platform.openai.com
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-creds" className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Google Calendar Credentials
            </Label>
            <Input
              id="google-creds"
              type="password"
              placeholder="Paste your Google OAuth credentials JSON"
              value={googleCredentials}
              onChange={(e) => setGoogleCredentials(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Follow the{" "}
              <a
                href="https://developers.google.com/calendar/api/quickstart/js"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Google Calendar API setup guide
              </a>
            </p>
          </div>

          <Button
            onClick={handleLogin}
            disabled={!openaiKey || !googleCredentials}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            size="lg"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Get Started with Kaisey
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Kaisey integrates with Canvas/LMS, Google Calendar, Apple Health, Strava, and Whoop to optimize your MBA experience.
          </p>
        </div>
      </Card>
    </div>
  );
}
