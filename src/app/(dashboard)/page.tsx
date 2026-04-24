"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";   // ← add this line
import { useBrainChat } from "@/lib/hooks/use-brain-chat";
// ... rest of imports
import { IDEA_CATEGORIES, IDEA_STATUSES, getScoreColor } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lightbulb,
  Zap,
  Radio,
  TrendingUp,
  Brain,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
// toast available for future error handling
// import { toast } from "sonner";

interface DashboardIdea {
  id: string;
  title: string;
  category: string;
  status: string;
  scoreOverall: string;
  [key: string]: unknown;
}

interface SourceHealth {
  id: string;
  name: string;
  platform: string;
  enabled: boolean;
  signalsTotal: number;
  lastCrawledAt: string;
  [key: string]: unknown;
}

export default function DashboardPage() {
  const [chatInput, setChatInput] = useState("");
  const [ideas, setIdeas] = useState<DashboardIdea[]>([]);
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [stats, setStats] = useState({
    totalIdeas: 0,
    signalsToday: 0,
    activeSources: 0,
    avgScore: 0,
  });
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [loadingSources, setLoadingSources] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, isStreaming } = useBrainChat({
    mode: "global",
  });

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);
      try {
        const [scoresRes, sourcesRes] = await Promise.all([
          fetch("/api/analytics/scores"),
          fetch("/api/analytics/sources"),
        ]);

        let totalIdeas = 0;
        let avgScore = 0;
        let activeSources = 0;
        let signalsToday = 0;

        if (scoresRes.ok) {
                const data = await scoresRes.json();
                const items = Array.isArray(data) ? data : data.ideas || data.data || [];

                // Prefer API aggregate if provided, fall back to computed count
                totalIdeas = data.totalIdeas ?? data.total ?? items.length;

                // Prefer API aggregate if provided, fall back to computed average
                if (typeof data.avgScore === "number") {
                  avgScore = Math.round(data.avgScore);
                } else if (items.length > 0) {
                  const scoreSum = items.reduce(
                    (sum: number, i: DashboardIdea) =>
                      sum + parseFloat(i.scoreOverall || "0"),
                    0
                  );
                  avgScore = Math.round(scoreSum / items.length);
                }
              }

        if (sourcesRes.ok) {
          const data = await sourcesRes.json();
          const srcItems = Array.isArray(data) ? data : data.sources || data.data || [];
          activeSources = srcItems.filter((s: SourceHealth) => s.enabled).length || data.activeSources || 0;
          signalsToday = srcItems.reduce(
            (sum: number, s: SourceHealth) => sum + (s.signalsTotal || 0),
            0
          ) || data.signalsToday || 0;
        }

        setStats({ totalIdeas, signalsToday, activeSources, avgScore });
      } catch {
        // Use fallback stats
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  // Fetch latest ideas
  useEffect(() => {
    async function fetchIdeas() {
      setLoadingIdeas(true);
      try {
        const res = await fetch("/api/ideas?limit=5&sort=newest");
        if (!res.ok) throw new Error("Failed to fetch ideas");
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.ideas || data.data || [];
        setIdeas(items.slice(0, 5));
      } catch {
        // Silent fail for dashboard
      } finally {
        setLoadingIdeas(false);
      }
    }
    fetchIdeas();
  }, []);

  // Fetch source health
  useEffect(() => {
    async function fetchSources() {
      setLoadingSources(true);
      try {
        const res = await fetch("/api/sources");
        if (!res.ok) throw new Error("Failed to fetch sources");
        const data = await res.json();
        setSources(
          Array.isArray(data) ? data : data.sources || data.data || []
        );
      } catch {
        // Silent fail
      } finally {
        setLoadingSources(false);
      }
    }
    fetchSources();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendChat() {
    const content = chatInput.trim();
    if (!content || isStreaming) return;
    setChatInput("");
    await sendMessage(content);
  }

  const statCards = [
    {
      label: "Total Ideas",
      value: stats.totalIdeas,
      icon: Lightbulb,
      color: "text-indigo-600",
    },
    {
      label: "Signals Today",
      value: stats.signalsToday,
      icon: Zap,
      color: "text-amber-500",
    },
    {
      label: "Active Sources",
      value: stats.activeSources,
      icon: Radio,
      color: "text-emerald-500",
    },
    {
      label: "Avg Score",
      value: stats.avgScore,
      icon: TrendingUp,
      color: "text-cyan-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 pt-0">
                <div className={cn("p-2 rounded-lg bg-gray-50", stat.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  {loadingStats ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two columns: Ideas + Brain Quick Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Latest Ideas */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Latest Ideas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingIdeas ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100"
                  >
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-10" />
                  </div>
                ))
              ) : ideas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No ideas yet
                </p>
              ) : (
                ideas.map((idea) => {
                  const category = IDEA_CATEGORIES.find(
                    (c) => c.value === idea.category
                  );
                  const status = IDEA_STATUSES.find(
                    (s) => s.value === idea.status
                  );
                  const score = parseFloat(idea.scoreOverall || "0");

                  return (
                    <Link
                      key={idea.id}
                      href={`/ideas/${idea.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {idea.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {category && (
                            <Badge variant="secondary" className="text-xs">
                              {category.label}
                            </Badge>
                          )}
                          {status && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full",
                                status.value === "approved" &&
                                  "bg-green-50 text-green-700",
                                status.value === "reviewing" &&
                                  "bg-yellow-50 text-yellow-700",
                                status.value === "detected" &&
                                  "bg-blue-50 text-blue-700",
                                status.value === "declined" &&
                                  "bg-red-50 text-red-700",
                                status.value === "incubating" &&
                                  "bg-purple-50 text-purple-700",
                                status.value === "archived" &&
                                  "bg-gray-50 text-gray-700"
                              )}
                            >
                              {status.value === "approved" && (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              {status.value === "declined" && (
                                <XCircle className="w-3 h-3" />
                              )}
                              {(status.value === "detected" ||
                                status.value === "reviewing") && (
                                <Clock className="w-3 h-3" />
                              )}
                              {status.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "text-lg font-bold tabular-nums shrink-0",
                          getScoreColor(score)
                        )}
                      >
                        {Number(score).toFixed(1)}
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Brain Quick Chat */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-600" />
                Brain Quick Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 max-h-64 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Ask Brain anything about the peptide market
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-lg p-3 text-sm",
                    msg.role === "user"
                      ? "bg-indigo-600 text-white ml-6"
                      : "bg-gray-100 text-gray-800 mr-6"
                  )}
                >
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {msg.role === "user" ? "You" : "Brain"}
                  </p>
                  <p className="line-clamp-4 whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              ))}
              {isStreaming &&
                messages.length > 0 &&
                messages[messages.length - 1].content === "" && (
                  <div className="bg-gray-100 rounded-lg p-3 mr-6">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              <div ref={chatEndRef} />
            </CardContent>
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ask Brain anything..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  className="flex-1"
                  disabled={isStreaming}
                />
                <button
                  className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  onClick={handleSendChat}
                  disabled={isStreaming || !chatInput.trim()}
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Source Health */}
      <Card>
        <CardHeader>
          <CardTitle>Source Health</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSources ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className={cn(
                    "rounded-lg border p-3 space-y-2",
                    source.enabled === false
                      ? "border-red-200 bg-red-50/50"
                      : "border-gray-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {source.name}
                    </p>
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        source.enabled ? "bg-green-500" : "bg-red-500"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{source.platform}</span>
                      <span>{source.signalsTotal} signals</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last crawled{" "}
                      {source.lastCrawledAt
                        ? formatDistanceToNow(
                            new Date(source.lastCrawledAt),
                            { addSuffix: true }
                          )
                        : "never"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
