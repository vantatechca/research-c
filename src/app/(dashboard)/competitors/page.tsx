"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Swords,
  Plus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Star,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface CompetitorProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  priceModel: string;
  rating: number;
  reviewCount: number;
  status: string;
}

interface Competitor {
  id: string;
  name: string;
  url: string;
  platform: string;
  notes: string;
  productsTracked: number;
  watchPriority: string;
  active: boolean;
  products: CompetitorProduct[];
}

const priorityColors: Record<string, string> = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-green-600 bg-green-50 border-green-200",
};

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [productCache, setProductCache] = useState<
    Record<string, CompetitorProduct[]>
  >({});
  const [productLoading, setProductLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // New competitor form state
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState("website");
  const [newPriority, setNewPriority] = useState("medium");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    async function fetchCompetitors() {
      setLoading(true);
      try {
        const res = await fetch("/api/competitors");
        if (!res.ok) throw new Error("Failed to fetch competitors");
        const data = await res.json();
        setCompetitors(
          Array.isArray(data)
            ? data
            : data.competitors || data.data || []
        );
      } catch {
        toast.error("Failed to load competitors");
      } finally {
        setLoading(false);
      }
    }
    fetchCompetitors();
  }, []);

  async function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Fetch products if not cached
        if (!productCache[id]) {
          fetchProducts(id);
        }
      }
      return next;
    });
  }

  async function fetchProducts(competitorId: string) {
    setProductLoading(competitorId);
    try {
      const res = await fetch(
        `/api/competitors/${competitorId}/products`
      );
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      const products = Array.isArray(data)
        ? data
        : data.products || data.data || [];
      setProductCache((prev) => ({ ...prev, [competitorId]: products }));
    } catch {
      toast.error("Failed to load products");
    } finally {
      setProductLoading(null);
    }
  }

  async function handleDelete(competitorId: string) {
    setDeletingId(competitorId);
    try {
      const res = await fetch(`/api/competitors/${competitorId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete competitor");
      setCompetitors((prev) => prev.filter((c) => c.id !== competitorId));
      toast.success("Competitor removed");
    } catch {
      toast.error("Failed to delete competitor");
    } finally {
      setDeletingId(null);
    }
  }
  async function handleToggleActive(competitorId: string, active: boolean) {
  setTogglingId(competitorId);
  
  // Optimistic update
  const previous = competitors;
  setCompetitors((prev) =>
    prev.map((c) => (c.id === competitorId ? { ...c, active } : c))
  );
  
  try {
    const res = await fetch(`/api/competitors/${competitorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) throw new Error("Failed to update competitor");
    toast.success(active ? "Competitor activated" : "Competitor deactivated");
  } catch {
    setCompetitors(previous);
    toast.error("Failed to update competitor");
  } finally {
    setTogglingId(null);
  }
}

  async function handleAddCompetitor() {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          url: newUrl,
          platform: newPlatform,
          watchPriority: newPriority,
          notes: newNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed to add competitor");
      const data = await res.json();
      const newComp = data.competitor || data;
      setCompetitors((prev) => [...prev, { ...newComp, products: [] }]);
      setDialogOpen(false);
      setNewName("");
      setNewUrl("");
      setNewPlatform("website");
      setNewPriority("medium");
      setNewNotes("");
      toast.success("Competitor added");
    } catch {
      toast.error("Failed to add competitor");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Swords className="w-5 h-5" />
          Competitor Watchlist
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="w-4 h-4 mr-1" />
            Add Competitor
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Competitor</DialogTitle>
              <DialogDescription>
                Add a competitor to your watchlist for tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Name
                </label>
                <Input
                  placeholder="Competitor name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">URL</label>
                <Input
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Platform
                  </label>
                  <Select value={newPlatform} onValueChange={(v) => { if (v) setNewPlatform(v); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="etsy">Etsy</SelectItem>
                      <SelectItem value="amazon">Amazon</SelectItem>
                      <SelectItem value="gumroad">Gumroad</SelectItem>
                      <SelectItem value="whop">Whop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Priority
                  </label>
                  <Select value={newPriority} onValueChange={(v) => { if (v) setNewPriority(v); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Notes
                </label>
                <Textarea
                  placeholder="Notes about this competitor..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCompetitor} disabled={submitting}>
                {submitting && (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                )}
                Add Competitor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead className="w-[15%]">Platform</TableHead>
                <TableHead className="w-[10%]">Products</TableHead>
                <TableHead className="w-[15%]">Priority</TableHead>
                <TableHead className="w-[20%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>  
              {competitors.map((comp) => {
                const isExpanded = expandedIds.has(comp.id || "");
                const products =
                  productCache[comp.id] || comp.products || [];

                return (
                  <Collapsible key={comp.id} open={isExpanded}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleExpanded(comp.id || "")}
                    >
                      <TableCell>
                        <CollapsibleTrigger
                          render={
                            <button className="p-0.5 rounded hover:bg-gray-100 transition-colors" />
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(comp.id || "");
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comp.name}</span>
                          {comp.url && (
                            <a
                              href={comp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        {comp.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                            {comp.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {comp.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {comp.productsTracked}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            priorityColors[comp.watchPriority || "medium"]
                          )}
                        >
                          {comp.watchPriority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Switch
                            checked={comp.active ?? true}
                            onCheckedChange={(checked) => handleToggleActive(comp.id, checked)}
                            disabled={togglingId === comp.id}
                          />
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(comp.id)}
                            disabled={deletingId === comp.id}
                          >
                            {deletingId === comp.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Products */}
                    <CollapsibleContent render={<tr />}>
                      <td colSpan={6} className="p-0">
                        <div className="bg-gray-50/70 px-6 py-4 border-t">
                          {productLoading === comp.id ? (
                            <div className="space-y-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton
                                  key={i}
                                  className="h-10 w-full"
                                />
                              ))}
                            </div>
                          ) : products.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No products tracked for this competitor.
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Rating</TableHead>
                                  <TableHead>Reviews</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {products.map((product) => (
                                  <TableRow key={product.id}>
                                    <TableCell className="font-medium">
                                      {product.name}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="secondary"
                                        className="text-xs capitalize"
                                      >
                                        {product.category?.replace("_", " ")}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm">
                                        ${product.price}
                                        {product.priceModel ===
                                          "subscription" && (
                                          <span className="text-xs text-muted-foreground">
                                            /mo
                                          </span>
                                        )}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        <span className="text-sm">
                                          {product.rating}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm">
                                        {product.reviewCount}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-xs capitalize",
                                          product.status === "active"
                                            ? "text-green-600 border-green-200"
                                            : product.status ===
                                              "price_changed"
                                            ? "text-amber-600 border-amber-200"
                                            : "text-red-600 border-red-200"
                                        )}
                                      >
                                        {product.status?.replace("_", " ")}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </td>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
