import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Embed from "./Embed.jsx";
import "./index.css";

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const Root = path === "/embed" ? Embed : App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
