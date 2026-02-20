import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an invoice data extractor. Analyze this image of a printed or handwritten bill/invoice and extract the following fields as JSON. If a field is not clearly visible or present, set it to null.

Extract:
- invoice_number: The invoice or bill number (string, e.g. "INV-001", "Bill No: 123")
- invoice_date: The invoice/bill date in YYYY-MM-DD format (string)
- due_date: The due date or payment deadline in YYYY-MM-DD format (string), null if not visible
- amount: The total amount as a number (no currency symbols, just the number, e.g. 75000)
- customer_name: The customer/buyer name if visible (string)
- description: A brief description of goods/services listed (string, max 200 chars)

Return ONLY valid JSON like:
{
  "invoice_number": "...",
  "invoice_date": "...",
  "due_date": null,
  "amount": 0,
  "customer_name": null,
  "description": null
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI request failed: ${err}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response as JSON");

    const extracted = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-invoice error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
