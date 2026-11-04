import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/system.css";

import MarkdownPreview from "./features/markdown-preview/MarkdownPreview";

const root = document.getElementById("root");

if (!root) {
  throw new Error("No root element found");
}

createRoot(root).render(
  <StrictMode>
    <MarkdownPreview />
  </StrictMode>,
);
