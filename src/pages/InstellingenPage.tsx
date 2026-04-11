import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Shield, Bell, Settings, Camera, Check, Loader2 } from "lucide-react";
import { uploadLogo, CB_FALLBACK_LOGO } from "@/lib/logo";

function ProfileTab() {
  const { user, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setAvatarUrl(url);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Voornaam en achternaam zijn verplicht.");
      return;
    }
    updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), avatarUrl });
    toast.success("Profiel bijgewerkt.");
  };

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profiel</h2>
        <p className="text-sm text-muted-foreground">Beheer je persoonlijke gegevens.</p>
      </div>

      <div className="flex items-center gap-4 sm:gap-5">
        <div className="relative group">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-border">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-base sm:text-lg font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="h-5 w-5 text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{firstName} {lastName}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Voornaam</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-10 sm:h-9" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Achternaam</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-10 sm:h-9" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="email">E-mailadres</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 sm:h-9" />
        </div>
      </div>

      <Button onClick={handleSave} className="gap-1.5 h-10 sm:h-9">
        <Check className="h-4 w-4" /> Opslaan
      </Button>
    </div>
  );
}

function SecurityTab() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSave = () => {
    if (!current || !newPass || !confirm) {
      toast.error("Vul alle velden in.");
      return;
    }
    if (newPass.length < 6) {
      toast.error("Nieuw wachtwoord moet minimaal 6 tekens zijn.");
      return;
    }
    if (newPass !== confirm) {
      toast.error("Wachtwoorden komen niet overeen.");
      return;
    }
    if (changePassword(current, newPass)) {
      toast.success("Wachtwoord gewijzigd.");
      setCurrent("");
      setNewPass("");
      setConfirm("");
    } else {
      toast.error("Huidig wachtwoord is onjuist.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Beveiliging</h2>
        <p className="text-sm text-muted-foreground">Wijzig je wachtwoord.</p>
      </div>

      <div className="space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <Label htmlFor="currentPass">Huidig wachtwoord</Label>
          <Input id="currentPass" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-10 sm:h-9" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPass">Nieuw wachtwoord</Label>
          <Input id="newPass" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="h-10 sm:h-9" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPass">Bevestig nieuw wachtwoord</Label>
          <Input id="confirmPass" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-10 sm:h-9" />
        </div>
      </div>

      <Button onClick={handleSave} className="gap-1.5 h-10 sm:h-9">
        <Check className="h-4 w-4" /> Wachtwoord wijzigen
      </Button>
    </div>
  );
}

function NotificationsTab() {
  const { user, updateProfile } = useAuth();
  const notif = user?.notifications ?? { contractExpiry90: true, eventReminder7: true, weeklyEventDigest: false };

  const toggle = (key: keyof typeof notif) => {
    updateProfile({ notifications: { ...notif, [key]: !notif[key] } });
    toast.success("Notificatie-instelling bijgewerkt.");
  };

  const items = [
    { key: "contractExpiry90" as const, label: "Contract vervalt binnen 90 dagen", desc: "Ontvang een e-mail wanneer een contract binnenkort afloopt." },
    { key: "eventReminder7" as const, label: "Evenement binnen 7 dagen", desc: "Herinnering wanneer een evenement binnenkort plaatsvindt." },
    { key: "weeklyEventDigest" as const, label: "Weekoverzicht evenementen", desc: "Wekelijkse samenvatting van komende evenementen." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Notificaties</h2>
        <p className="text-sm text-muted-foreground">Beheer je e-mailmeldingen.</p>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-4 border-b border-border last:border-0 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <Switch checked={notif[item.key]} onCheckedChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformTab() {
  const { platformSettings, updatePlatformSettings, isAdmin } = useAuth();
  const [companyName, setCompanyName] = useState(platformSettings.companyName);
  const [logoUrl, setLogoUrl] = useState(platformSettings.companyLogoUrl);

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Platform</h2>
        <p className="text-sm text-muted-foreground">Alleen beheerders kunnen platforminstellingen wijzigen.</p>
      </div>
    );
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updatePlatformSettings({
      companyName: companyName.trim() || "Elia Campus",
      companyLogoUrl: logoUrl,
    });
    toast.success("Platforminstellingen bijgewerkt.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Platform</h2>
        <p className="text-sm text-muted-foreground">Beheer de globale instellingen van het platform.</p>
      </div>

      <div className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label>Standaard taal</Label>
          <Select value={platformSettings.defaultLanguage} onValueChange={(v) => updatePlatformSettings({ defaultLanguage: v as "nl" | "fr" | "en" })}>
            <SelectTrigger className="h-10 sm:h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nl">Nederlands</SelectItem>
              <SelectItem value="fr">Frans</SelectItem>
              <SelectItem value="en">Engels</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Standaard weergave evenementen</Label>
          <Select value={platformSettings.defaultEventView} onValueChange={(v) => updatePlatformSettings({ defaultEventView: v as "list" | "calendar" })}>
            <SelectTrigger className="h-10 sm:h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Lijst</SelectItem>
              <SelectItem value="calendar">Kalender</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyName">Bedrijfsnaam</Label>
          <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Elia Campus" className="h-10 sm:h-9" />
        </div>

        <div className="space-y-1.5">
          <Label>Bedrijfslogo</Label>
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded object-contain border border-border" />}
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" className="h-10 sm:h-8" asChild>
                <span><Camera className="h-3.5 w-3.5 mr-1.5" /> Logo uploaden</span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="gap-1.5 h-10 sm:h-9">
        <Check className="h-4 w-4" /> Opslaan
      </Button>
    </div>
  );
}

export default function InstellingenPage() {
  return (
    <div className="page-container animate-fade-in-up">
      <h1 className="mb-4 sm:mb-6">Instellingen</h1>

      <div className="surface-card p-4 sm:p-6">
        <Tabs defaultValue="profiel">
          <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="profiel" className="gap-1.5 text-xs sm:text-sm"><User className="h-3.5 w-3.5" /> Profiel</TabsTrigger>
            <TabsTrigger value="beveiliging" className="gap-1.5 text-xs sm:text-sm"><Shield className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Beveiliging</span><span className="sm:hidden">Beveil.</span></TabsTrigger>
            <TabsTrigger value="notificaties" className="gap-1.5 text-xs sm:text-sm"><Bell className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Notificaties</span><span className="sm:hidden">Notif.</span></TabsTrigger>
            <TabsTrigger value="platform" className="gap-1.5 text-xs sm:text-sm"><Settings className="h-3.5 w-3.5" /> Platform</TabsTrigger>
          </TabsList>

          <TabsContent value="profiel"><ProfileTab /></TabsContent>
          <TabsContent value="beveiliging"><SecurityTab /></TabsContent>
          <TabsContent value="notificaties"><NotificationsTab /></TabsContent>
          <TabsContent value="platform"><PlatformTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
