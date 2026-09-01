import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import MarkdownPreviewer from "./features/markdown-preview/MarkdownPreviewer";

import "./styles/system.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MarkdownPreviewer />
  </StrictMode>,
);
