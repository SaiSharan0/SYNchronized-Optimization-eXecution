import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Component {...pageProps} />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--panel)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "13px",
            },
            success: { iconTheme: { primary: "#16a34a", secondary: "var(--panel)" } },
            error:   { iconTheme: { primary: "#dc2626", secondary: "var(--panel)" } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
