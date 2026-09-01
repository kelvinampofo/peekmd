import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/system.css";

import MarkdownPreviewer from "./features/markdown-preview/MarkdownPreviewer";

const root = document.getElementById("root");

if (!root) {
  throw new Error("No root element found");
}

createRoot(root).render(
  <StrictMode>
    <MarkdownPreviewer />
  </StrictMode>,
);
