"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getScoreColor } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  GraduationCap,
  Signal,
} from "lucide-react";
import { toast } from "sonner";

interface TrendSnapshot {
  id: string;
  keyword: string;
  value: number;
  deltaPercent: number | null;
  capturedAt: string;
  [key: string]: unknown;
}

interface ScoredIdea {
  id: string;
  title: string;
  category: string;
  status: string;
  scoreOverall: string;
  [key: string]: unknown;
}

interface SourceAnalytics {
  id: string;
  name: string;
  platform: string;
  enabled: boolean;
  signalsTotal: number;
  [key: string]: unknown;
}

interface FeedbackPattern {
  id: string;
  patternDescription: string;
  patternType: string;
  confidence: number;
  appliedCount: number;
  overrideCount: number;
  suggestedAsRule: boolean;
  [key: string]: unknown;
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("trends");
  const [trends, setTrends] = useState<TrendSnapshot[]>([]);
  const [ideas, setIdeas] = useState<ScoredIdea[]>([]);
  const [sources, setSources] = useState<SourceAnalytics[]>([]);
  const [patterns, setPatterns] = useState<FeedbackPattern[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({
    trends: true,
    scores: true,
    sources: true,
    learning: true,
  });

  // Fetch trends
  // Fetch all analytics data in parallel
useEffect(() => {
  async function fetchAll() {
    try {
      const [trendsRes, scoresRes, sourcesRes, patternsRes] = await Promise.all([
        fetch("/api/analytics/trends"),
        fetch("/api/analytics/scores"),
        fetch("/api/analytics/sources"),
        fetch("/api/analytics/patterns"),
      ]);

      // Process trends
      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(Array.isArray(data) ? data : data.trends || data.data || []);
      }
      setLoading((prev) => ({ ...prev, trends: false }));

      // Process scores
      if (scoresRes.ok) {
        const data = await scoresRes.json();
        const items = Array.isArray(data) ? data : data.ideas || data.data || [];
        setIdeas(
          [...items].sort(
            (a, b) =>
              parseFloat(b.scoreOverall || "0") - parseFloat(a.scoreOverall || "0")
          )
        );
      }
      setLoading((prev) => ({ ...prev, scores: false }));

      // Process sources
      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        const items = Array.isArray(data) ? data : data.sources || data.data || [];
        setSources(
          [...items].sort((a, b) => (b.signalsTotal || 0) - (a.signalsTotal || 0))
        );
      }
      setLoading((prev) => ({ ...prev, sources: false }));

      // Process patterns
      if (patternsRes.ok) {
        const data = await patternsRes.json();
        setPatterns(Array.isArray(data) ? data : data.patterns || data.data || []);
      }
      setLoading((prev) => ({ ...prev, learning: false }));
    } catch {
      toast.error("Failed to load analytics");
      setLoading({
        trends: false,
        scores: false,
        sources: false,
        learning: false,
      });
    }
  }
  fetchAll();
}, []);

  // Process trends into grouped keywords
  // Group trends by keyword and find the latest snapshot per group
const keywordEntries = new Map<string, TrendSnapshot[]>();
for (const t of trends) {
  const k = t.keyword || "";
  if (!keywordEntries.has(k)) keywordEntries.set(k, []);
  keywordEntries.get(k)!.push(t);
}

const trendKeywords = Array.from(keywordEntries.entries()).map(
  ([keyword, entries]) => {
    const sorted = [...entries].sort(
      (a, b) =>
        new Date(b.capturedAt || 0).getTime() -
        new Date(a.capturedAt || 0).getTime()
    );
    const latest = sorted[0];
    return {
      keyword,
      latestValue: parseFloat(String(latest?.value || "0")),
      delta: latest?.deltaPercent
        ? parseFloat(String(latest.deltaPercent))
        : null,
    };
  }
);

  const maxSignals = sources[0]?.signalsTotal || 1;

  function TabSkeleton() {
    return (
      <div className="space-y-3 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        Analytics
      </h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="trends">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="scores">
            <Signal className="w-3.5 h-3.5 mr-1" />
            Scores
          </TabsTrigger>
          <TabsTrigger value="sources">
            <Database className="w-3.5 h-3.5 mr-1" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="learning">
            <GraduationCap className="w-3.5 h-3.5 mr-1" />
            Learning
          </TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends">
          {loading.trends ? (
            <TabSkeleton />
          ) : (
            <div className="space-y-4 mt-4">
              {/* Chart placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Trend Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-48 rounded-lg bg-gray-50 border border-dashed border-gray-200">
                    <div className="text-center text-muted-foreground">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        Trend chart showing keyword volume over 12 weeks
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Keyword list */}
              <Card>
                <CardHeader>
                  <CardTitle>Peptide Keywords</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trendKeywords.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No trend data available
                    </p>
                  )}
                  {trendKeywords.map((tk) => (
                    <div
                      key={tk.keyword}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{tk.keyword}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium tabular-nums">
                          {Number(tk.latestValue).toFixed(1)}
                        </span>
                        {tk.delta !== null && (
                          <span
                            className={cn(
                              "flex items-center gap-0.5 text-xs font-medium",
                              tk.delta >= 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {tk.delta >= 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {Math.abs(Number(tk.delta)).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Scores Tab */}
        <TabsContent value="scores">
          {loading.scores ? (
            <TabSkeleton />
          ) : (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Ideas by Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ideas.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No scored ideas available
                  </p>
                )}
                {ideas.map((idea) => {
                  const score = parseFloat(idea.scoreOverall || "0");
                  return (
                    <div
                      key={idea.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
                    >
                      <div
                        className={cn(
                          "text-base font-bold tabular-nums w-12 text-center shrink-0",
                          getScoreColor(score)
                        )}
                      >
                        {Number(score).toFixed(1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/ideas/${idea.id}`}
                          className="text-sm font-medium hover:text-indigo-600 transition-colors truncate block"
                        >
                          {idea.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {idea.category?.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              idea.status === "approved" &&
                                "text-green-600 border-green-200",
                              idea.status === "reviewing" &&
                                "text-yellow-600 border-yellow-200",
                              idea.status === "detected" &&
                                "text-blue-600 border-blue-200",
                              idea.status === "declined" &&
                                "text-red-600 border-red-200"
                            )}
                          >
                            {idea.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="w-24 shrink-0">
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              score >= 70
                                ? "bg-green-500"
                                : score >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources">
          {loading.sources ? (
            <TabSkeleton />
          ) : (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Sources by Signal Count</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sources.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No source analytics available
                  </p>
                )}
                {sources.map((source) => {
                  const total = source.signalsTotal || 0;
                  const pct = (total / maxSignals) * 100;

                  return (
                    <div
                      key={source.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{source.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {source.platform}
                          </Badge>
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              source.enabled ? "bg-green-500" : "bg-red-500"
                            )}
                          />
                        </div>
                      </div>
                      <div className="w-32 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium tabular-nums w-10 text-right">
                            {total}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Learning Tab */}
        <TabsContent value="learning">
          {loading.learning ? (
            <TabSkeleton />
          ) : (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Feedback Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patterns.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No feedback patterns available
                  </p>
                )}
                {patterns.map((pattern) => {
                  const confidence = parseFloat(
                    String(pattern.confidence || "0")
                  );

                  return (
                    <div
                      key={pattern.id}
                      className="p-4 rounded-lg border border-gray-100 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium flex-1">
                          {pattern.patternDescription}
                        </p>
                        {pattern.suggestedAsRule && (
                          <Badge className="text-xs shrink-0 bg-amber-100 text-amber-800 border-amber-200">
                            Rule Suggested
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {pattern.patternType?.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Applied {pattern.appliedCount} times
                        </span>
                        {(pattern.overrideCount ?? 0) > 0 && (
                          <span className="text-xs text-amber-600">
                            {pattern.overrideCount} overrides
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Confidence
                          </span>
                          <span className="font-medium">
                            {Number(confidence).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              confidence >= 70
                                ? "bg-green-500"
                                : confidence >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
