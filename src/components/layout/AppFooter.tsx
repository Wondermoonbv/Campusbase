import { Link } from "react-router-dom";

export function AppFooter() {
  return (
    <footer className="py-4 text-center text-xs text-muted-foreground/60 border-t border-border">
      © {new Date().getFullYear()} CampusBase ·{" "}
      <Link to="/privacy" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
        Privacy Policy
      </Link>
    </footer>
  );
}
