import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeLocalStorage } from "./data/mockData";

// Initialize mock data in localStorage
initializeLocalStorage();

createRoot(document.getElementById("root")!).render(<App />);
