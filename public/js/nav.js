document.addEventListener("click", async (event) => {
  const link = event.target.closest("a[data-spa]");
  if (!link) return;

  event.preventDefault();

  const url = link.href;

  console.log("[NAV:] Fetching", url);

  // Fetch partial content
  const response = await fetch(url, {
    headers: { "X-SPA": "true" }
  });

  console.log("[NAV:] Express Fetch Response:");
  console.dir(response, { depth: null });

  const html = await response.text();

  console.log("HTML LENGTH:", html.length);

  // Inject into <main>
  document.querySelector("main").innerHTML = html;

  // Update browser history
  window.history.pushState({}, "", url);
});

// Handle Back/Forward buttons
window.addEventListener("popstate", async () => {
  const url = window.location.pathname;

  const response = await fetch(url, {
    headers: { "X-SPA": "true" }
  });

  const html = await response.text();

  document.querySelector("main").innerHTML = html;
});
