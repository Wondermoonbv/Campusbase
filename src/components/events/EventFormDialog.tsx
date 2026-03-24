import { mockSchools } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function EventFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Evenement toegevoegd.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuw evenement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Naam *</Label>
            <Input required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select defaultValue="jobbeurs">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jobbeurs">Jobbeurs</SelectItem>
                  <SelectItem value="campus presentatie">Campus presentatie</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                  <SelectItem value="andere">Andere</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum *</Label>
              <Input type="date" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startuur</Label>
              <Input type="time" />
            </div>
            <div>
              <Label>Einduur</Label>
              <Input type="time" />
            </div>
          </div>
          <div>
            <Label>Locatie</Label>
            <Input />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>School</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger>
                <SelectContent>
                  {mockSchools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Verantwoordelijke</Label>
              <Input />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Elia contactpersoon</Label>
              <Input />
            </div>
            <div>
              <Label>Teamleden</Label>
              <Input placeholder="Naam 1, Naam 2, ..." />
            </div>
          </div>
          <div>
            <Label>Beschrijving</Label>
            <Textarea rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type stand</Label>
              <Select defaultValue="jobbeurs stand">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jobbeurs stand">Jobbeurs stand</SelectItem>
                  <SelectItem value="infotafel">Infotafel</SelectItem>
                  <SelectItem value="presentatie">Presentatie</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="anders">Anders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Standformaat</Label>
              <Select defaultValue="medium 4m²">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="klein 2m²">Klein 2m²</SelectItem>
                  <SelectItem value="medium 4m²">Medium 4m²</SelectItem>
                  <SelectItem value="groot 6m²+">Groot 6m²+</SelectItem>
                  <SelectItem value="anders">Anders</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Budget (€)</Label>
              <Input type="number" />
            </div>
            <div>
              <Label>Status</Label>
              <Select defaultValue="gepland">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gepland">Gepland</SelectItem>
                  <SelectItem value="bevestigd">Bevestigd</SelectItem>
                  <SelectItem value="afgelopen">Afgelopen</SelectItem>
                  <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Opbouwdatum</Label>
              <Input type="date" />
            </div>
            <div>
              <Label>Opbouwuur</Label>
              <Input type="time" />
            </div>
          </div>
          <div>
            <Label>Notities</Label>
            <Textarea rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit">Toevoegen</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
