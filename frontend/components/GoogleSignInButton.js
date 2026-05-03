import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { extractError } from "../lib/utils";

const SCRIPT_ID = "google-identity-services";
let initializedClientId = "";

export default function GoogleSignInButton({ onCredential, label = "Continue with Google" }) {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const load = () => {
      if (!window.google || !buttonRef.current || cancelled) return;
      if (initializedClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async response => {
            try {
              await onCredential(response.credential);
            } catch (err) {
              toast.error(extractError(err));
            }
          },
        });
        initializedClientId = clientId;
      }
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: Math.min(360, buttonRef.current.offsetWidth || 360),
        text: "continue_with",
        shape: "rectangular",
      });
      setReady(true);
    };

    if (window.google) {
      load();
      return;
    }

    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", load);
    return () => {
      cancelled = true;
      script.removeEventListener("load", load);
    };
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <button
        type="button"
        onClick={() => toast.error("Add NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env.local and GOOGLE_CLIENT_ID in backend/.env")}
        className="w-full btn-primary justify-center py-3"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="w-full">
      <div ref={buttonRef} className="flex min-h-[44px] w-full justify-center" />
      {!ready && <div className="btn-primary w-full justify-center py-3">Loading Google...</div>}
    </div>
  );
}
