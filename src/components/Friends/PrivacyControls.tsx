import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Shield, Lock, Unlock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrivacySetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: "eye" | "lock" | "users";
}

export function PrivacyControls() {
  const [previewMode, setPreviewMode] = useState(false);
  const [settings, setSettings] = useState<PrivacySetting[]>([
    {
      id: "activities",
      label: "Show my activities",
      description: "Friends can see events you're attending",
      enabled: true,
      icon: "users",
    },
    {
      id: "events",
      label: "Show my events",
      description: "Friends can see events you've created",
      enabled: true,
      icon: "eye",
    },
    {
      id: "location",
      label: "Share my location",
      description: "Friends can see your city and region",
      enabled: false,
      icon: "lock",
    },
    {
      id: "bookmarks",
      label: "Show bookmarked events",
      description: "Friends can see events you've saved",
      enabled: true,
      icon: "eye",
    },
    {
      id: "reviews",
      label: "Show my reviews",
      description: "Friends can see your event reviews",
      enabled: true,
      icon: "users",
    },
    {
      id: "friend-list",
      label: "Show friend list",
      description: "Friends can see your other friends",
      enabled: false,
      icon: "lock",
    },
  ]);
  const { toast } = useToast();

  const toggleSetting = (id: string) => {
    setSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );

    toast({
      title: "Privacy updated",
      description: "Your privacy settings have been saved",
    });
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "eye":
        return Eye;
      case "lock":
        return Lock;
      case "users":
        return Users;
      default:
        return Shield;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Privacy Controls</h2>
          <p className="text-muted-foreground">
            Manage what your friends can see
          </p>
        </div>
        <Button
          variant={previewMode ? "default" : "outline"}
          onClick={() => setPreviewMode(!previewMode)}
          className="gap-2"
        >
          {previewMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {previewMode ? "Exit Preview" : "Preview Mode"}
        </Button>
      </div>

      {previewMode && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Preview Mode Active</p>
                <p className="text-sm text-muted-foreground">
                  You're viewing your profile as your friends see it
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settings.map((setting) => {
          const Icon = getIcon(setting.icon);
          return (
            <Card
              key={setting.id}
              className={`transition-all duration-300 ${
                setting.enabled
                  ? "bg-card/50 backdrop-blur-sm border-2 hover:border-primary/50"
                  : "bg-muted/30 border-2 border-dashed"
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      setting.enabled ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        setting.enabled ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{setting.label}</CardTitle>
                        {setting.enabled ? (
                          <Unlock className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <CardDescription>{setting.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={setting.enabled}
                    onCheckedChange={() => toggleSetting(setting.id)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant={setting.enabled ? "default" : "secondary"}>
                  {setting.enabled ? "Visible to friends" : "Hidden"}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {settings.filter(s => s.enabled).length}
              </span>
              <span className="text-sm text-muted-foreground">
                settings enabled
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {settings.filter(s => !s.enabled).length}
              </span>
              <span className="text-sm text-muted-foreground">
                settings hidden
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
