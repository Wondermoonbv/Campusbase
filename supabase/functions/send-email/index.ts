const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  icsContent?: string;
}

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // DEBUG: Verifiëer RESEND_API_KEY beschikbaarheid
  console.log("DEBUG: RESEND_API_KEY aanwezig:", !!Deno.env.get("RESEND_API_KEY"));
  console.log("DEBUG: RESEND_API_KEY lengte:", (Deno.env.get("RESEND_API_KEY") ?? "").length);
  console.log("DEBUG: RESEND_API_KEY prefix:", (Deno.env.get("RESEND_API_KEY") ?? "geen").substring(0, 6));

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { to, subject, html, replyTo, icsContent }: EmailParams = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build attachments array if ICS content provided
    const attachments: Array<{ filename: string; content: string }> = [];
    if (icsContent) {
      attachments.push({
        filename: "event.ics",
        content: icsContent,
      });
    }

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "CampusBase <noreply@campusbase.be>",
        to: [to],
        subject,
        html,
        reply_to: replyTo ?? "campusbase@campusbase.be",
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      return new Response(
        JSON.stringify({ error: result.error || "Failed to send email" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
