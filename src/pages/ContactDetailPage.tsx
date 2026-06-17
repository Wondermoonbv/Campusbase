import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, Mail, Phone, Linkedin, Building2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useContacten, useScholen } from "@/hooks/useScholen";
import { ContactFormDialog } from "@/components/schools/ContactFormDialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { OrganisatieLabel } from "@/components/organisaties/OrganisatieLabel";
import { ContactmomentenSection } from "@/components/contactmomenten/ContactmomentenSection";
import { ContactMailDialog } from "@/components/contacten/ContactMailDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { toast } from "sonner";
import type { Contact } from "@/types/crm";

export default function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { contacten, isLoading, upsertContact, deleteContact } = useContacten();
  const { scholen } = useScholen();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);

  const contact = contacten.find((c) => c.id === id);
  const organisatie = contact?.organisatie_id ? scholen.find((s) => s.id === contact.organisatie_id) : null;

  if (isLoading && !contact) {
    return (
      <div className="page-container">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="page-container">
        <p className="text-muted-foreground">Contactpersoon niet gevonden.</p>
        <Link to="/contacten" className="text-primary hover:underline text-sm mt-2 inline-block">← Terug naar contacten</Link>
      </div>
    );
  }

  const handleSave = async (saved: Contact) => {
    try { await upsertContact.mutateAsync(saved); } catch { toast.error("Fout bij opslaan."); }
  };

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync({ id: contact.id, name: contact.name });
      toast.success("Contact verwijderd.");
      navigate("/contacten");
    } catch (error) {
      handleDeleteError(error, "contact");
    }
    setDeleteOpen(false);
  };

  return (
    <div className="page-container animate-fade-in-up">
      <Link to="/contacten" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Terug naar contacten
      </Link>

      <div className="surface-card p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-lg sm:text-2xl">{contact.name}</h1>
              {contact.role && <Badge variant="outline">{contact.role}</Badge>}
            </div>
            {contact.department && (
              <p className="text-sm text-muted-foreground mb-1">{contact.department}</p>
            )}
            {organisatie ? (
              <p className="text-xs sm:text-sm text-muted-foreground inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <Link to={`/organisaties/${organisatie.id}`} className="text-primary hover:underline">{organisatie.name}</Link>
                <OrganisatieLabel organisatieId={organisatie.id} />
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Geen organisatie gekoppeld</p>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              {/* Mail sturen knop verborgen tot na tests */}
              {/*
              <Button
                variant="outline"
                size="sm"
                className="h-10 sm:h-8"
                onClick={() => setMailOpen(true)}
                disabled={!contact.email}
                title={contact.email ? undefined : "Geen e-mailadres"}
              >
                <Send className="h-4 w-4 mr-1" /> Mail sturen
              </Button>
              */}
              <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-1" /> Bewerken
              </Button>
              <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 sm:gap-6 text-sm">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="text-primary hover:underline inline-flex items-center gap-1 break-all">
              <Mail className="h-3.5 w-3.5 shrink-0" /> {contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {contact.phone}
            </a>
          )}
          {contact.linkedin_url && (
            <a href={contact.linkedin_url} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
              <Linkedin className="h-3.5 w-3.5" /> LinkedIn
            </a>
          )}
        </div>

        {contact.notes && (
          <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
        )}
      </div>

      {contact.organisatie_id ? (
        <ContactmomentenSection organisatieId={contact.organisatie_id} contactId={contact.id} />
      ) : (
        <div className="surface-card p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold">Logboek</h2>
          </div>
          <p className="text-sm text-muted-foreground">Koppel deze contactpersoon eerst aan een organisatie om contactmomenten te kunnen loggen.</p>
        </div>
      )}

      <ContactFormDialog open={editOpen} onOpenChange={setEditOpen} contact={contact} onSave={handleSave} showSchoolSelect />
      <DeleteConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} itemName={contact.name} isLoading={deleteContact.isPending} />
      <ContactMailDialog open={mailOpen} onOpenChange={setMailOpen} contact={contact} />
    </div>
  );
}
