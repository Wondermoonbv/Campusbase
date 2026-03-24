import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      toast.success("Succesvol ingelogd.");
    } else {
      toast.error("Onbekend e-mailadres. Probeer admin@elia.be of viewer@elia.be");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto">
        <div className="surface-card p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold">Elia Campus</h1>
            <p className="text-sm text-muted-foreground mt-1">Recruitment CRM</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@elia.be" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full">Inloggen</Button>
          </form>
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p><strong>Demo accounts:</strong></p>
            <p>admin@elia.be (Admin) · viewer@elia.be (Viewer)</p>
            <p className="opacity-60">Elk wachtwoord werkt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
