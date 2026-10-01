import { createRoot } from "react-dom/client";

import Root from "./Root";
import { ErrorBoundary } from "@/components/error-boundary";

import "./index.css";

// Auto-detect system theme on load
const savedTheme = localStorage.getItem("tema");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
} else if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: light)").matches
) {
  document.documentElement.setAttribute("data-theme", "light");
}

createRoot(document.getElementById("root")!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
}).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>,
);
