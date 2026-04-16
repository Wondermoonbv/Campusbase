import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    if (success) {
      toast.success("Succesvol ingelogd.");
      navigate("/");
    } else {
      toast.error("Ongeldig e-mailadres of wachtwoord.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm mx-auto px-4">
        <div className="bg-card border border-border rounded-xl p-8 space-y-6 shadow-sm">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-2">
              <span className="text-lg font-bold text-primary">CB</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">CampusBase</h1>
            <p className="text-sm text-muted-foreground">Campus Recruitment CRM</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voornaam.achternaam@elia.be"
                required
                autoFocus
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-10"
              />
            </div>
            <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? "Inloggen..." : "Inloggen"}
            </Button>
          </form>
          <div className="text-xs text-muted-foreground text-center space-y-1 pt-2 border-t border-border">
            <p className="font-medium">Accounts aanmaken via Supabase dashboard</p>
            <p className="opacity-60">Authentication → Users → Add user</p>
          </div>
          <p className="text-xs text-muted-foreground/60 text-center">
            Door in te loggen ga je akkoord met onze{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
