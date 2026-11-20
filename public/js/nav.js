function initContactEmail() {
  const el = document.getElementById('contact-email');
  if (!el) return;
  const parts = ['hello', 'tobarnacluas', 'ie'];
  el.textContent = `${parts[0]}@${parts[1]}.${parts[2]}`;
  el.href = `mailto:${parts[0]}@${parts[1]}.${parts[2]}`;
}

function onPageInit() {
  initContactEmail();
  // future per-page init logic goes here
}

const LEAVE_MS = 350;   // length of the fade-out before fetching
let navToken = 0;       // increases with every navigation; the newest one wins

async function navigate(url, { push = true } = {}) {
  const myToken = ++navToken;
  const main = document.querySelector("main");

  document.body.classList.add("is-navigating");
  const slowNavTimer = setTimeout(() => {
    if (myToken === navToken) document.body.classList.add("is-slow");
  }, LEAVE_MS + 500);

  try {
    main.classList.add("is-leaving");
    await new Promise(r => setTimeout(r, LEAVE_MS));

    const response = await fetch(url, { headers: { "X-SPA": "true" } });

    // 404 is a real page (our 404 partial). Any other error is a server problem.
    if (!response.ok && response.status !== 404) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // A newer navigation started while we waited: let that one finish instead
    if (myToken !== navToken) return;

    main.classList.remove("is-leaving");
    main.classList.add("is-entering");
    await swapMainContent(main, html);
    main.classList.remove("is-entering");

    if (push) window.history.pushState({}, "", url);

    // Start the new page at the top ("instant" overrides the CSS smooth scrolling)
    window.scrollTo({ top: 0, behavior: "instant" });

    // Page title sent by the server (see render() in app.js)
    const title = response.headers.get("X-Page-Title");
    if (title) document.title = decodeURIComponent(title);

    onPageInit();
    document.dispatchEvent(new CustomEvent('player:pagechanged', {
      detail: { scope: main }
    }));

  } catch (err) {
    // Never leave a blank page: fall back to a normal page load
    console.error("[nav] SPA navigation failed, doing a full page load:", err);
    window.location.href = url;
  } finally {
    clearTimeout(slowNavTimer);
    if (myToken === navToken) {
      document.body.classList.remove("is-navigating", "is-slow");
    }
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-spa]");
  if (!link) return;

  // Let the browser handle new-tab / new-window clicks normally
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();
  navigate(link.href);
});

window.addEventListener("popstate", () => {
  navigate(window.location.pathname, { push: false });
});

async function swapMainContent(main, html) {
  if (document.startViewTransition) {
    await document.startViewTransition(() => {
      main.innerHTML = html;
    }).finished;
  } else {
    main.innerHTML = html;
  }
}

document.addEventListener('DOMContentLoaded', onPageInit);