// Listen for all click events at document level
document.addEventListener("click", async (event) => {
  
  // Find nearest ancestor <a> element in DOM tree with data-spa,
  // starting from clicked element
  const link = event.target.closest("a[data-spa]");
  if (!link) return;

  // Prevent browser default navigation behavior
  // (full page reload)
  event.preventDefault();

  // Absolute URL from JS link object
  const url = link.href;

  console.log("[NAV:] Fetching", url);

  // Fetch server-rendered HTML fragment
  const response = await fetch(url, {
    headers: { "X-SPA": "true" }
  });

  console.log("[NAV:] Express Fetch Response:");
  console.dir(response, { depth: null });

  const html = await response.text();

  console.log("HTML LENGTH:", html.length);

  // Inject HTML into <main>
  document.querySelector("main").innerHTML = html;

  // Re-initialize overlay icons for newly injected DOM
  initOverlayIcons(document.querySelector("main"));

  // Re-bind click handlers for mix images
  if (window.bindMixImageClickHandlers) {
    window.bindMixImageClickHandlers();
  }

  // Restore active mix UI state from player state / localStorage
  // (sync audio state with DOM)
  if (window.restoreActiveMixState) {
    window.restoreActiveMixState();
  }

  // Update browser history
  window.history.pushState({}, "", url);
});

// Handle Back/Forward buttons
window.addEventListener("popstate", async () => {
  const url = window.location.pathname;

  // Fetch the correct server-rendered HTML fragment for this history entry
  const response = await fetch(url, {
    headers: { "X-SPA": "true" }
  });

  const html = await response.text();

  // Replace <main> contents with the fetched HTML
  document.querySelector("main").innerHTML = html;

  // Re-initialize overlay play icons for injected DOM
  initOverlayIcons(document.querySelector("main"));

  // Re-bind click handlers for newly injected content
  if (window.bindMixImageClickHandlers) {
    window.bindMixImageClickHandlers();
  }

  // Restore active mix UI state after history navigation
  if (window.restoreActiveMixState) {
    window.restoreActiveMixState();
  }
});
