import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, getClientIP } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

type Action = "signup" | "cancel" | "resignup";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = getClientIP(req);
  const rl = checkRateLimit(ip, { maxRequests: 20, windowSeconds: 60 });
  if (!rl.allowed) {
    return jsonResponse({ error: "Te veel verzoeken. Probeer het over " + rl.retryAfterSeconds + " seconden opnieuw." }, 429);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Serverconfiguratie ontbreekt." }, 500);
    }

    const body = await req.json();
    const accessToken = String(body.accessToken ?? "").trim();
    const evenementId = String(body.evenementId ?? "").trim();
    const action = body.action as Action;
    const inschrijvingId = body.inschrijvingId ? String(body.inschrijvingId).trim() : null;

    if (!accessToken || !evenementId) {
      return jsonResponse({ error: "Ongeldige aanvraag." }, 400);
    }

    if (!["signup", "cancel", "resignup"].includes(action)) {
      return jsonResponse({ error: "Onbekende actie." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Verify token belongs to an active ambassador
    const { data: ambassador, error: ambErr } = await admin
      .from("ambassadeurs")
      .select("id, is_active")
      .eq("access_token", accessToken)
      .maybeSingle();

    if (ambErr) throw ambErr;
    if (!ambassador) {
      return jsonResponse({ error: "Ongeldige toegang." }, 401);
    }
    if (ambassador.is_active === false) {
      return jsonResponse({ error: "Account is inactief." }, 403);
    }

    // 2. Verify event exists and is not cancelled
    const { data: event, error: evErr } = await admin
      .from("evenementen")
      .select("id, status, max_ambassadeurs")
      .eq("id", evenementId)
      .maybeSingle();

    if (evErr) throw evErr;
    if (!event) {
      return jsonResponse({ error: "Evenement niet gevonden." }, 404);
    }
    if (event.status === "geannuleerd") {
      return jsonResponse({ error: "Evenement is geannuleerd." }, 400);
    }

    // 3. Perform the requested action
    if (action === "signup") {
      // Check if already signed up (non-cancelled)
      const { data: existing } = await admin
        .from("event_inschrijvingen")
        .select("id, status")
        .eq("evenement_id", evenementId)
        .eq("ambassadeur_id", ambassador.id)
        .maybeSingle();

      if (existing && existing.status !== "afgemeld") {
        return jsonResponse({ alreadyEnrolled: true }, 200);
      }

      // Check max capacity
      if (event.max_ambassadeurs) {
        const { count } = await admin
          .from("event_inschrijvingen")
          .select("id", { count: "exact", head: true })
          .eq("evenement_id", evenementId)
          .neq("status", "afgemeld");

        if ((count ?? 0) >= event.max_ambassadeurs) {
          return jsonResponse({ error: "Maximum aantal inschrijvingen bereikt." }, 400);
        }
      }

      if (existing) {
        // Re-activate previously cancelled signup
        const { error } = await admin
          .from("event_inschrijvingen")
          .update({ status: "ingeschreven" })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await admin
          .from("event_inschrijvingen")
          .insert({
            evenement_id: evenementId,
            ambassadeur_id: ambassador.id,
            status: "ingeschreven",
          });
        if (error) throw error;
      }

      return jsonResponse({ success: true }, 200);
    }

    if (action === "cancel" || action === "resignup") {
      if (!inschrijvingId) {
        return jsonResponse({ error: "Inschrijving ontbreekt." }, 400);
      }

      // Verify the inschrijving belongs to this ambassador
      const { data: inschrijving, error: inErr } = await admin
        .from("event_inschrijvingen")
        .select("id, ambassadeur_id, evenement_id")
        .eq("id", inschrijvingId)
        .maybeSingle();

      if (inErr) throw inErr;
      if (!inschrijving) {
        return jsonResponse({ error: "Inschrijving niet gevonden." }, 404);
      }
      if (inschrijving.ambassadeur_id !== ambassador.id) {
        return jsonResponse({ error: "Geen toegang tot deze inschrijving." }, 403);
      }
      if (inschrijving.evenement_id !== evenementId) {
        return jsonResponse({ error: "Inschrijving komt niet overeen met evenement." }, 400);
      }

      // For resignup: check capacity
      if (action === "resignup" && event.max_ambassadeurs) {
        const { count } = await admin
          .from("event_inschrijvingen")
          .select("id", { count: "exact", head: true })
          .eq("evenement_id", evenementId)
          .neq("status", "afgemeld");

        if ((count ?? 0) >= event.max_ambassadeurs) {
          return jsonResponse({ error: "Maximum aantal inschrijvingen bereikt." }, 400);
        }
      }

      const newStatus = action === "cancel" ? "afgemeld" : "ingeschreven";
      const { error } = await admin
        .from("event_inschrijvingen")
        .update({ status: newStatus })
        .eq("id", inschrijvingId);

      if (error) throw error;

      return jsonResponse({ success: true }, 200);
    }

    return jsonResponse({ error: "Onbekende actie." }, 400);
  } catch (error) {
    console.error("public-event-rsvp failed", error);
    return jsonResponse({ error: "Er ging iets mis. Probeer het opnieuw." }, 500);
  }
});
