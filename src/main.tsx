import { applyTheme, startThemeSync } from "./lib/userTheme";
applyTheme();
startThemeSync();
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAutoTranslate } from "./lib/siteTranslate";

createRoot(document.getElementById("root")!).render(<App />);
initAutoTranslate();
