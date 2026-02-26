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

let isNavigating = false;
let slowNavTimer = null;
let navToken = 0;

document.addEventListener("click", async (event) => {
  const link = event.target.closest("a[data-spa]");
  if (!link) return;

  event.preventDefault();
  if (isNavigating) return;

  isNavigating = true;
  document.body.classList.add("is-navigating");

  const myToken = ++navToken;

  try {
    const url = link.href;
    const main = document.querySelector("main");

    main.classList.add("is-leaving");
    await new Promise(r => setTimeout(r, 350));

    slowNavTimer = setTimeout(() => {
      if (isNavigating && myToken === navToken) {
        document.body.classList.add("is-slow");
      }
    }, 500);

    const response = await fetch(url, {
      headers: { "X-SPA": "true" }
    });

    const html = await response.text();

    main.classList.remove("is-leaving");
    main.classList.add("is-entering");

    await swapMainContent(main, html);

    main.classList.remove("is-entering");
    onPageInit();

    document.dispatchEvent(new CustomEvent('player:pagechanged', {
      detail: { scope: main }
    }));

    window.history.pushState({}, "", url);

  } finally {
    isNavigating = false;
    clearTimeout(slowNavTimer);
    slowNavTimer = null;
    document.body.classList.remove("is-navigating", "is-slow");
  }
});

window.addEventListener("popstate", async () => {
  const url = window.location.pathname;
  const main = document.querySelector("main");

  main.classList.add("is-leaving");
  await new Promise(r => setTimeout(r, 350));

  const response = await fetch(url, {
    headers: { "X-SPA": "true" }
  });

  const html = await response.text();

  main.classList.remove("is-leaving");
  main.classList.add("is-entering");

  await swapMainContent(main, html);
  main.classList.remove("is-entering");
  onPageInit();

  document.dispatchEvent(new CustomEvent('player:pagechanged', {
    detail: { scope: main }
  }));
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', onPageInit);