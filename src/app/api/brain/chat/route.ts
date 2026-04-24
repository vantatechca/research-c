import { NextRequest } from "next/server";

const CANNED_RESPONSES: Record<string, string> = {
  bpc: "Based on my analysis of 14 signals across 4 platforms, the BPC-157 + TB-500 stacking protocol builder remains your strongest opportunity.\n\nDemand signals are accelerating: Reddit r/peptides sees 2-3 new stacking questions daily, and the YouTube video documenting 12-week results just crossed 127K views.\n\nThe competitive landscape is thin — only 2 basic PDF guides and StackOptimizer.io (which launched 3 weeks ago with mixed reviews at 4.0 stars).\n\nI recommend prioritizing this as your first product. The SaaS model at $19-29/month gives you strong recurring revenue potential. An MVP could be ready in 6-8 weeks.",

  ghk: "GHK-Cu is having a significant moment right now. A single TikTok video hit 2.1M views showing before/after skincare results, and the hashtag #ghkcu has accumulated 18M total views.\n\nThe competition analysis is remarkable — zero dedicated courses exist. Only surface-level blog posts from PeptideMD Academy and one YouTube channel (BiohackHer) with 3 videos.\n\nGoogle Trends shows 'GHK-Cu skincare' growing 45% over 6 months. This is a textbook gap opportunity with a closing window. The anti-aging skincare course could be priced at $49-149.\n\nThe main risk is that GHK-Cu is a narrower peptide than BPC-157, so the total addressable market is smaller.",

  semaglutide: "Semaglutide and GLP-1 agonists represent the largest peptide market opportunity by raw demand volume — search volume is massive and still growing.\n\nHowever, competition is significantly higher here. Several tracking apps already exist, though most are generic weight loss tools rather than peptide-specific.\n\nThe differentiation strategy would be peptide-specific features: dose escalation tracking, side effect monitoring tailored to GLP-1 agonists, and community features for the peptide-using demographic.\n\nI scored the tracker idea at 71.8 overall. The demand (95/100) and trend (98/100) scores are exceptional, but competition (45/100) drags down the overall score.",

  score: "The scoring system evaluates ideas across 5 dimensions:\n\n1. **Demand** — Signal volume, engagement metrics, search trends\n2. **Competition** — Existing products, quality gaps, market saturation\n3. **Revenue** — Pricing potential, model type (SaaS vs one-time), TAM\n4. **Build Effort** — Technical complexity, time to MVP, ongoing maintenance\n5. **Trend** — Growth trajectory, virality indicators, seasonal patterns\n\nEach dimension is scored 0-100, and the overall score is a weighted average with confidence adjustments. Golden Rules can boost or penalize scores based on your preferences.\n\nCurrently, your top 3 ideas by score are: BPC-157/TB-500 Protocol Builder (82.4), Reconstitution Calculator (78.6), and Peptide Beginner's Masterclass (76.0).",

  default: "I've been analyzing the peptide product market continuously across 10 configured sources. Here's what I'm seeing:\n\nThe most promising opportunities right now center around **interactive tools** rather than static content. Your approval pattern strongly favors AI-powered products (83% approval rate) over traditional ebooks and guides (29%).\n\nThree areas deserve your attention:\n1. **BPC-157/TB-500 stacking tools** — highest demand, moderate competition\n2. **GHK-Cu anti-aging content** — viral momentum, zero competition\n3. **Peptide reconstitution calculators** — classic quick-win, massive recurring demand\n\nWould you like me to deep-dive into any of these opportunities, or explore a specific peptide or market segment?",
};

function selectResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("bpc") || lower.includes("tb-500") || lower.includes("stacking")) {
    return CANNED_RESPONSES.bpc;
  }
  if (lower.includes("ghk") || lower.includes("anti-aging") || lower.includes("skincare")) {
    return CANNED_RESPONSES.ghk;
  }
  if (lower.includes("semaglutide") || lower.includes("glp") || lower.includes("weight loss")) {
    return CANNED_RESPONSES.semaglutide;
  }
  if (lower.includes("score") || lower.includes("scoring") || lower.includes("how do you")) {
    return CANNED_RESPONSES.score;
  }
  return CANNED_RESPONSES.default;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId, mode } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const responseText = selectResponse(message);
    const words = responseText.split(" ");
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
  async start(controller) {
    for (let i = 0; i < words.length; i++) {
      const word = (i === 0 ? "" : " ") + words[i];
      // Send as SSE format: "data: {...}\n\n"
      const payload = `data: ${JSON.stringify({ token: word })}\n\n`;
      controller.enqueue(encoder.encode(payload));
      await new Promise((resolve) =>
        setTimeout(resolve, 10 + Math.random() * 30)
      );
    }
    // Signal end of stream
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  },
});

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Conversation-Id": conversationId || "new",
        "X-Mode": mode || "global",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
