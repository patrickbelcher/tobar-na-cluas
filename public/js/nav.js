let isNavigating = false;
let slowNavTimer = null;
let navToken = 0;

// Listen for all click events at document level
document.addEventListener("click", async (event) => {

  // Find nearest ancestor <a> element in DOM tree with data-spa,
  // starting from clicked element
  const link = event.target.closest("a[data-spa]");
  if (!link) return;
  
  // Prevent browser default navigation behavior
  // (full page reload)
  event.preventDefault();

  if (isNavigating) return; // ignore double clicks

  isNavigating = true;
  document.body.classList.add("is-navigating");

  const myToken = ++navToken;

  try {
    // Absolute URL from JS link object
    const url = link.href;
    console.log("[NAV:] Fetching", url);

    const main = document.querySelector("main");

    // Animate OUT
    main.classList.add("is-leaving");

    // Wait for animation to finish
    await new Promise(r => setTimeout(r, 350));

    // simulate slow network
    // await delay(5000); 

    slowNavTimer = setTimeout(() => {
      // Only apply if this navigation is still current
      if (isNavigating && myToken === navToken) {
        document.body.classList.add("is-slow");
      }
    }, 500);

    // Fetch server-rendered HTML fragment
    const response = await fetch(url, {
      headers: { "X-SPA": "true" }
    });

    console.log("[NAV:] Express Fetch Response:");
    console.dir(response, { depth: null });

    const html = await response.text();
    console.log("HTML LENGTH:", html.length);

    // Prepare ENTER state
    main.classList.remove("is-leaving");
    main.classList.add("is-entering");

    // Swap content
    await swapMainContent(main, html);

    // Animate IN
    main.classList.remove("is-entering");

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

  } finally {
    // Unlock navigation
    isNavigating = false;

    clearTimeout(slowNavTimer);
    slowNavTimer = null;

    document.body.classList.remove("is-navigating", "is-slow");
  }
});

// Handle Back/Forward buttons
window.addEventListener("popstate", async () => {
  const url = window.location.pathname;
  const main = document.querySelector("main");

  main.classList.add("is-leaving");

  await new Promise(r => setTimeout(r, 350));

  // Fetch the correct server-rendered HTML fragment for this history entry
  const response = await fetch(url, {
    headers: { "X-SPA": "true" }
  });

  const html = await response.text();

  main.classList.remove("is-leaving");
  main.classList.add("is-entering");

  // Replace <main> contents with the fetched HTML
  await swapMainContent(main, html);
  main.classList.remove("is-entering");

  // Re-initialize overlay play icons for injected DOM
  initOverlayIcons(main);

  // Re-bind click handlers for newly injected content
  if (window.bindMixImageClickHandlers) {
    window.bindMixImageClickHandlers();
  }

  // Restore active mix UI state after history navigation
  if (window.restoreActiveMixState) {
    window.restoreActiveMixState();
  }
});

async function swapMainContent(main, html) {
  if (document.startViewTransition) {
    // Native view transition (Chrome, Edge, Safari TP)
    await document.startViewTransition(() => {
      main.innerHTML = html;
    }).finished;
  } else {
    // Fallback CSS-based transition flow
    main.innerHTML = html;
  }
}

// Simulate network delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

