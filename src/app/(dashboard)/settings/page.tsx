"use client";

import { mockUsers } from "@/mock/data";
import { signOut } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, User, Users, Bell, LogOut } from "lucide-react";

export default function SettingsPage() {
  const currentUser = mockUsers[0];

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Settings className="w-5 h-5" />
        Settings
      </h2>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback className="bg-indigo-600 text-white">
                AD
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-medium">{currentUser.name}</p>
              <p className="text-sm text-muted-foreground">
                {currentUser.email}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto capitalize">
              {currentUser.role}
            </Badge>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Name</p>
              <p className="text-sm font-medium">{currentUser.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Email</p>
              <p className="text-sm font-medium">{currentUser.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Role</p>
              <p className="text-sm font-medium capitalize">{currentUser.role}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Member Since
              </p>
              <p className="text-sm font-medium">
                {currentUser.createdAt
                  ? new Date(currentUser.createdAt).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Digest Time
              </p>
              <p className="text-sm font-medium">
                {(currentUser.preferences as { digestTime?: string })
                  ?.digestTime || "08:00"}{" "}
                AM
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Default View
              </p>
              <p className="text-sm font-medium capitalize">
                {(currentUser.preferences as { defaultView?: string })
                  ?.defaultView || "feed"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-indigo-600/80 text-white text-xs">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant="outline" className="text-xs capitalize">
                {user.role}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign out of your account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You&apos;ll need to log in again to access your workspace.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}