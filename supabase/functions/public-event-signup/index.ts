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

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").trim();
}

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

    const { evenementId, name, email, department } = await req.json();

    const sanitizedName = stripHtml(String(name ?? ""));
    const sanitizedEmail = String(email ?? "").trim().toLowerCase();
    const sanitizedDepartment = stripHtml(String(department ?? ""));

    if (!evenementId || !sanitizedName || !sanitizedEmail) {
      return jsonResponse({ error: "Naam en e-mail zijn verplicht." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: event, error: eventError } = await admin
      .from("evenementen")
      .select("id")
      .eq("id", evenementId)
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) {
      return jsonResponse({ error: "Evenement niet gevonden." }, 404);
    }

    const { data: existingAmbassador, error: existingAmbassadorError } = await admin
      .from("ambassadeurs")
      .select("id")
      .eq("email", sanitizedEmail)
      .maybeSingle();

    if (existingAmbassadorError) throw existingAmbassadorError;

    let ambassadeurId = existingAmbassador?.id ?? null;

    if (!ambassadeurId) {
      const { data: createdAmbassador, error: createAmbassadorError } = await admin
        .from("ambassadeurs")
        .insert({
          full_name: sanitizedName,
          email: sanitizedEmail,
          department: sanitizedDepartment,
        })
        .select("id")
        .single();

      if (createAmbassadorError) {
        if (createAmbassadorError.code === "23505") {
          const { data: duplicateAmbassador, error: duplicateAmbassadorError } = await admin
            .from("ambassadeurs")
            .select("id")
            .eq("email", sanitizedEmail)
            .maybeSingle();

          if (duplicateAmbassadorError) throw duplicateAmbassadorError;
          if (!duplicateAmbassador) {
            return jsonResponse({ error: "Kon ambassadeur niet ophalen." }, 500);
          }

          ambassadeurId = duplicateAmbassador.id;
        } else {
          throw createAmbassadorError;
        }
      } else {
        ambassadeurId = createdAmbassador.id;
      }
    }

    const { data: existingEnrollment, error: existingEnrollmentError } = await admin
      .from("event_inschrijvingen")
      .select("id")
      .eq("evenement_id", evenementId)
      .eq("ambassadeur_id", ambassadeurId)
      .maybeSingle();

    if (existingEnrollmentError) throw existingEnrollmentError;

    if (existingEnrollment) {
      return jsonResponse({ alreadyEnrolled: true }, 200);
    }

    const { error: enrollmentError } = await admin
      .from("event_inschrijvingen")
      .insert({
        evenement_id: evenementId,
        ambassadeur_id: ambassadeurId,
        status: "ingeschreven",
      });

    if (enrollmentError) throw enrollmentError;

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("public-event-signup failed", error);
    return jsonResponse({ error: "Er ging iets mis. Probeer het opnieuw." }, 500);
  }
});
