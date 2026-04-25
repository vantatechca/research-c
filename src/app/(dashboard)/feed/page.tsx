"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSSE } from "@/lib/hooks/use-sse";
import {
  IDEA_CATEGORIES,
  IDEA_STATUSES,
  OPPORTUNITY_TYPES,
  getScoreBgColor,
} from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Check,
  X,
  MessageCircle,
  Search,
  ArrowUpDown,
  FlaskConical,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

type SortKey = "newest" | "highest";

interface Idea {
  id: string;
  title: string;
  summary: string;
  category: string;
  peptideFocus: string[];
  opportunityType: string;
  status: string;
  scoreOverall: string;
  confidence: string;
  evidenceCount: number;
  createdAt: string;
  [key: string]: unknown;
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="flex flex-col">
          <CardContent className="flex-1 space-y-3 pt-0">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-14 rounded-lg" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // SSE for real-time updates
  const eventTypes = useMemo(() => ["new_idea", "idea_updated"], []);
  const { events, isConnected } = useSSE<Idea>("/api/signals/feed", eventTypes);

  // Prepend new ideas from SSE events
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[0];
      if (latestEvent.type === "new_idea" && latestEvent.data) {
        setIdeas((prev) => {
          const exists = prev.some((i) => i.id === (latestEvent.data as Idea).id);
          if (exists) return prev;
          toast.info("New idea detected in the feed");
          return [latestEvent.data as Idea, ...prev];
        });
      }
    }
  }, [events]);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("sort", sortBy);

      const res = await fetch(`/api/ideas?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch ideas");
      const data = await res.json();
      setIdeas(Array.isArray(data) ? data : data.ideas || data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ideas");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, sortBy]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  async function handleApprove(ideaId: string) {
    setActionLoading(ideaId + "-approve");
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve idea");
      setIdeas((prev) =>
        prev.map((i) => (i.id === ideaId ? { ...i, status: "approved" } : i))
      );
      toast.success("Idea approved");
    } catch {
      toast.error("Failed to approve idea");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(ideaId: string) {
    setActionLoading(ideaId + "-decline");
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
      if (!res.ok) throw new Error("Failed to decline idea");
      setIdeas((prev) =>
        prev.map((i) => (i.id === ideaId ? { ...i, status: "declined" } : i))
      );
      toast.success("Idea declined");
    } catch {
      toast.error("Failed to decline idea");
    } finally {
      setActionLoading(null);
    }
  }

  function handleChat(ideaId: string) {
    router.push(`/brain?ideaId=${ideaId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Idea Feed</h2>
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <Select
            value={sortBy}
            onValueChange={(v) => {
              if (v) setSortBy(v as SortKey);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="highest">Highest Score</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search ideas, peptides..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              if (v) setCategoryFilter(v);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {IDEA_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              if (v) setStatusFilter(v);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {IDEA_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className="text-xs text-muted-foreground">
            {ideas.length} ideas
          </Badge>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 pt-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchIdeas}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && <FeedSkeleton />}

      {/* Empty State */}
      {!loading && !error && ideas.length === 0 && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No ideas match your filters</p>
          </div>
        </div>
      )}

      {/* Idea Grid */}
      {!loading && ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas.map((idea) => {
            const score = parseFloat(idea.scoreOverall || "0");
            const confidence = parseFloat(idea.confidence || "0");
            const category = IDEA_CATEGORIES.find(
              (c) => c.value === idea.category
            );
            const status = IDEA_STATUSES.find((s) => s.value === idea.status);
            const oppType = OPPORTUNITY_TYPES.find(
              (o) => o.value === idea.opportunityType
            );

            return (
              <Card key={idea.id} className="flex flex-col">
                <CardContent className="flex-1 space-y-3 pt-0">
                  {/* Title + Score */}
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/ideas/${idea.id}`}
                      className="text-sm font-medium hover:text-indigo-600 transition-colors line-clamp-2 flex-1"
                    >
                      {idea.title}
                    </Link>
                    <div
                      className={cn(
                        "text-xl font-bold tabular-nums shrink-0 px-2 py-1 rounded-lg border",
                        getScoreBgColor(score)
                      )}
                    >
                      {Number(score).toFixed(1)}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {category && (
                      <Badge variant="secondary" className="text-xs">
                        {category.label}
                      </Badge>
                    )}
                    {oppType && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          oppType.color.replace("bg-", "text-")
                        )}
                      >
                        {oppType.label}
                      </Badge>
                    )}
                    {status && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          status.value === "approved" &&
                            "text-green-600 border-green-200",
                          status.value === "reviewing" &&
                            "text-yellow-600 border-yellow-200",
                          status.value === "detected" &&
                            "text-blue-600 border-blue-200",
                          status.value === "declined" &&
                            "text-red-600 border-red-200",
                          status.value === "incubating" &&
                            "text-purple-600 border-purple-200"
                        )}
                      >
                        {status.label}
                      </Badge>
                    )}
                  </div>

                  {/* Confidence Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Confidence</span>
                      <span>{Number(confidence).toFixed(0)}%</span>
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

                  {/* Peptide Tags */}
                  {idea.peptideFocus && idea.peptideFocus.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {idea.peptideFocus.map((peptide: string) => (
                        <span
                          key={peptide}
                          className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700"
                        >
                          <FlaskConical className="w-3 h-3" />
                          {peptide}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Evidence Count */}
                  <div className="text-xs text-muted-foreground">
                    {idea.evidenceCount} evidence signals
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-green-600 hover:bg-green-50"
                      disabled={actionLoading === idea.id + "-approve"}
                      onClick={() => handleApprove(idea.id)}
                    >
                      {actionLoading === idea.id + "-approve" ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-red-600 hover:bg-red-50"
                      disabled={actionLoading === idea.id + "-decline"}
                      onClick={() => handleDecline(idea.id)}
                    >
                      {actionLoading === idea.id + "-decline" ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5 mr-1" />
                      )}
                      Decline
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-gray-600 hover:bg-gray-50 ml-auto"
                      onClick={() => handleChat(idea.id)}
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
