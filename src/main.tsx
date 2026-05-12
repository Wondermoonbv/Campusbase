import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const CHUNK_RELOAD_KEY = "chunk_reload_attempted";

function isChunkLoadError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Loading chunk") ||
    message.includes("Importing a module script failed")
  );
}

function handleChunkError(message: string | undefined) {
  if (!isChunkLoadError(message)) return;
  const alreadyAttempted = sessionStorage.getItem(CHUNK_RELOAD_KEY);
  if (!alreadyAttempted) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  } else {
    import("sonner").then(({ toast }) =>
      toast.error("Er is een update beschikbaar. Ververs de pagina.", {
        duration: Infinity,
        action: {
          label: "Ververs",
          onClick: () => {
            sessionStorage.removeItem(CHUNK_RELOAD_KEY);
            window.location.reload();
          },
        },
      })
    );
  }
}

window.addEventListener("error", (event) => {
  handleChunkError(event.message || event.error?.message);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = typeof reason === "string" ? reason : reason?.message;
  handleChunkError(message);
});

// Reset reload flag once the app has successfully loaded.
setTimeout(() => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}, 5000);

createRoot(document.getElementById("root")!).render(<App />);
