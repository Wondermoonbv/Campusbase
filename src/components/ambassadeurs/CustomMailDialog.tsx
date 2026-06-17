import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientCount: number;
  sending: boolean;
  onSend: (subject: string, body: string, includePortal: boolean) => void;
}

export function CustomMailDialog({ open, onOpenChange, recipientCount, sending, onSend }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [includePortal, setIncludePortal] = useState(true);

  useEffect(() => {
    if (open) {
      setSubject("");
      setBody("");
      setIncludePortal(true);
    }
  }, [open]);

  const canSend = subject.trim().length > 0 && body.trim().length > 0 && !sending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mail sturen</DialogTitle>
          <DialogDescription>
            {recipientCount === 1
              ? "Stuur een persoonlijke mail naar 1 ambassadeur."
              : `Stuur een mail naar ${recipientCount} ambassadeurs.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mail-subject">Onderwerp</Label>
            <Input
              id="mail-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
              placeholder="Onderwerp van de mail"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mail-body">Bericht</Label>
            <Textarea
              id="mail-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Typ hier je bericht. De aanhef &quot;Dag {voornaam},&quot; wordt automatisch toegevoegd."
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="mail-portal" className="cursor-pointer">Persoonlijke portaallink toevoegen</Label>
              <p className="text-xs text-muted-foreground">Voegt onderaan een knop naar het ambassadeurportaal toe.</p>
            </div>
            <Switch id="mail-portal" checked={includePortal} onCheckedChange={setIncludePortal} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Annuleer</Button>
          <Button onClick={() => onSend(subject.trim(), body, includePortal)} disabled={!canSend}>
            {sending ? "Versturen..." : `Verstuur (${recipientCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}