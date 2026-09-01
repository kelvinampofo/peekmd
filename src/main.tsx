import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import MarkdownPreviewer from "./features/markdown-preview/MarkdownPreviewer";

import "./styles/system.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("No root element found");
}

createRoot(root).render(
  <StrictMode>
    <MarkdownPreviewer />
  </StrictMode>,
);
