import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { sendEmail, buildSimpleEmail } from "@/lib/email";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Contact } from "@/types/crm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
}

export function ContactMailDialog({ open, onOpenChange, contact }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) { setSubject(""); setBody(""); }
  }, [open]);

  if (!contact) return null;

  const hasEmail = !!contact.email;
  const canSend = hasEmail && subject.trim().length > 0 && body.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!contact.email || !contact.organisatie_id) {
      toast.error("Geen e-mailadres of organisatie.");
      return;
    }
    setSending(true);
    try {
      const result = await sendEmail({
        to: contact.email,
        subject: subject.trim(),
        html: buildSimpleEmail(body),
        replyTo: user?.email || undefined,
      });
      if (!result.success) {
        toast.error(result.error ?? "Fout bij versturen.");
        return;
      }

      // Log contactmoment
      const { data: moment, error: insErr } = await supabase
        .from("contactmomenten")
        .insert({
          organisatie_id: contact.organisatie_id,
          contact_id: contact.id,
          type: "mail",
          onderwerp: subject.trim(),
          notities: body,
          occurred_at: new Date().toISOString(),
          created_by: user?.id ?? null,
          bron: "systeem",
        })
        .select("id")
        .single();
      if (insErr) {
        console.error(insErr);
        toast.warning("Mail verstuurd, maar logboek-registratie mislukt.");
      } else if (moment) {
        const { error: linkErr } = await supabase
          .from("contactmoment_contacten")
          .insert({ contactmoment_id: (moment as any).id, contact_id: contact.id });
        if (linkErr) console.error(linkErr);
      }

      qc.invalidateQueries({ queryKey: ["contactmomenten"] });
      toast.success(`Mail verstuurd naar ${contact.name}`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Fout bij versturen.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mail sturen</DialogTitle>
          <DialogDescription>
            Aan: <span className="font-medium text-foreground">{contact.name}</span>
            {hasEmail ? <> &lt;{contact.email}&gt;</> : <span className="text-destructive"> — geen e-mailadres</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-mail-subject">Onderwerp</Label>
            <Input id="contact-mail-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} disabled={!hasEmail} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-mail-body">Bericht</Label>
            <Textarea id="contact-mail-body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} disabled={!hasEmail} placeholder="Typ hier je bericht..." />
          </div>
          {user?.email && (
            <p className="text-xs text-muted-foreground">Antwoorden gaan naar {user.email}.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Annuleer</Button>
          <Button onClick={handleSend} disabled={!canSend}>{sending ? "Versturen..." : "Verstuur"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}