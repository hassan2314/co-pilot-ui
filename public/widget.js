/* Chat-only widget. The panel is an iframe of /embed on this same origin,
   so the customer page does not call the API directly.
   <script src="https://YOUR_UI/widget.js" data-name="Docs Assistant" data-color="#2f5d50" data-logo="https://example.com/logo.png" defer></script>
*/
(function () {
  var script = document.currentScript;
  if (!script || window.__ACME_DOCS_WIDGET__) return;
  window.__ACME_DOCS_WIDGET__ = true;

  var name = (script.getAttribute("data-name") || "Docs Assistant").slice(0, 60);
  var color = script.getAttribute("data-color") || "#2f5d50";
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) color = "#2f5d50";
  var logo = script.getAttribute("data-logo") || "";
  if (!/^https?:\/\//i.test(logo) && !(logo.charAt(0) === "/" && logo.charAt(1) !== "/")) {
    logo = "";
  }
  var origin = (script.getAttribute("data-origin") || new URL(script.src, window.location.href).origin).replace(/\/$/, "");
  var params = new URLSearchParams();
  params.set("name", name);
  params.set("color", color);
  if (logo) params.set("logo", logo);

  var root = document.createElement("div");
  root.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:Georgia,serif;";

  var button = document.createElement("button");
  button.type = "button";
  button.textContent = name;
  button.setAttribute("aria-expanded", "false");
  button.style.cssText =
    "border:0;border-radius:999px;padding:12px 16px;cursor:pointer;color:#f4efe6;font:600 15px/1.2 Georgia,serif;box-shadow:0 8px 24px rgba(0,0,0,.18);background:" +
    color;

  var frame = document.createElement("iframe");
  frame.title = name;
  frame.src = origin + "/embed?" + params.toString();
  frame.hidden = true;
  frame.style.cssText =
    "position:absolute;right:0;bottom:58px;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 110px));border:0;border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.2);background:#fffdf8;";

  function setOpen(open) {
    frame.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  button.addEventListener("click", function () {
    setOpen(frame.hidden);
  });

  root.appendChild(frame);
  root.appendChild(button);
  document.body.appendChild(root);
})();
