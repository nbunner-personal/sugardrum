/* Sugardrum site scripts. Loaded as an ES module. */

// Light/dark toggle. The footer radios switch theme with CSS alone (:has());
// this remembers the choice. The saved value is applied early by an inline
// script in the base layout via <html data-theme>.
const root = document.documentElement;
const themeInputs = document.querySelectorAll('input[name="theme"]');
themeInputs.forEach((input) => {
  if (input.value === root.dataset.theme) input.checked = true;
  input.addEventListener("change", () => {
    root.dataset.theme = input.value;
    try {
      localStorage.setItem("theme", input.value);
    } catch (e) {
      // Storage unavailable (private mode etc.) – the toggle still works for this page.
    }
  });
});

// Mobile navigation toggle
const navToggle = document.querySelector(".mobileNavIcon");
const nav = document.getElementById("menu-top-nav");
if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const open = getComputedStyle(nav).display === "none";
    nav.style.display = open ? "block" : "";
    document.getElementById("menuClosed").hidden = open;
    document.getElementById("menuOpen").hidden = !open;
    navToggle.setAttribute("aria-expanded", String(open));
  });
}

// Replace a placeholder with an autoplaying YouTube player
function playVideo(trigger, scroll) {
  const id = trigger && trigger.dataset.videoId;
  const player = document.getElementById("videoPlayer");
  if (!id || !player) return;
  const title = trigger.querySelector("span");
  const description = trigger.querySelector("em");
  let html = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" width="560" height="315" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  if (title) {
    html += `<p>${title.innerHTML} &mdash; <em>${description ? description.innerHTML : ""}</em></p>`;
  }
  player.innerHTML = html;
  if (scroll) window.scrollTo({ top: 110, behavior: "smooth" });
}

document.querySelectorAll(".videoThumbnail").forEach((thumb) => {
  thumb.addEventListener("click", () => playVideo(thumb, true));
  thumb.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    playVideo(thumb, true);
  });
});

const homeThumb = document.querySelector(".homeVideoThumbnail");
document.querySelectorAll(".homeVideoThumbnail, .homeVideoPlayButton").forEach((el) =>
  el.addEventListener("click", () => playVideo(homeThumb, false))
);

// Photo lightbox (LiteLight) – only loaded on pages with `a.lightbox` links
if (document.querySelector("a.lightbox")) {
  import("./vendor/lite-light.min.js").then(({ init }) => {
    init({ imageSelector: "a.lightbox", imageUrlAttribute: "href" });
    addLightboxCaptions();
  });
}

// LiteLight has no captions, so show the link's title underneath the open image.
function addLightboxCaptions() {
  const box = document.querySelector(".lite-light");
  const image = box && box.querySelector("img");
  if (!image) return;
  const caption = document.createElement("p");
  caption.className = "lite-light-caption";
  caption.hidden = true;
  box.appendChild(caption);

  new MutationObserver(() => {
    const link = [...document.querySelectorAll("a.lightbox")].find((a) => a.href === image.src);
    const text = link ? link.title : "";
    caption.textContent = text;
    caption.hidden = !text;
    if (text) image.alt = text;
  }).observe(image, { attributes: true, attributeFilter: ["src"] });
}
