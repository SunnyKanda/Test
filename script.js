/* Handy Halifax — quote form, WhatsApp handoff and mobile nav */

// Replace with your real WhatsApp number, international format, no "+".
const WHATSAPP_NUMBER = "447563123456";

// Optional lead backup. Create a free form at https://formspree.io and paste
// its endpoint here (e.g. "https://formspree.io/f/abcdwxyz"). While left as
// REPLACE_ME the site still works — it just skips the backup copy.
const FORMSPREE_ENDPOINT = "https://formspree.io/f/REPLACE_ME";

const form = document.getElementById("quoteForm");
const copyBtn = document.getElementById("copyQuote");
const toast = document.getElementById("toast");

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map((input) => input.value);
}

function field(id) {
  return document.getElementById(id).value.trim();
}

function buildQuoteMessage() {
  const jobTypes = getCheckedValues("jobType");
  return [
    "Hi, I'd like a quote for an odd job.",
    "",
    `Job type: ${jobTypes.length ? jobTypes.join(", ") : "Not specified"}`,
    `Details: ${field("jobDetails") || "Not provided"}`,
    `Items/tasks: ${field("itemsCount") || "Not provided"}`,
    `Wall type: ${field("wallType") || "Not provided"}`,
    `Fixings/brackets: ${field("fixings") || "Not provided"}`,
    `Postcode: ${field("postcode") || "Not provided"}`,
    `Preferred day/time: ${field("preferredTime") || "Flexible"}`,
    `Name: ${field("customerName") || "Not provided"}`,
    `Phone: ${field("customerPhone") || "Not provided"}`,
    "",
    "I will send photos now so you can confirm the quote."
  ].join("\n");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function isFormValid() {
  if (!field("jobDetails") || !field("postcode") || !field("customerName")) {
    form.reportValidity();
    return false;
  }
  return true;
}

// Sends a backup copy (and any photos) to Formspree if configured.
async function sendBackup(message) {
  if (FORMSPREE_ENDPOINT.includes("REPLACE_ME")) return;
  try {
    const data = new FormData(form);
    data.append("quoteSummary", message);
    await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" }
    });
  } catch (err) {
    // A failed backup must never block the WhatsApp handoff.
    console.warn("Lead backup could not be sent:", err);
  }
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!isFormValid()) return;

  const message = buildQuoteMessage();
  sendBackup(message); // fire-and-forget; WhatsApp opens regardless

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank", "noopener");
  showToast("Opening WhatsApp — add your photos, then send.");
});

copyBtn.addEventListener("click", async function () {
  if (!isFormValid()) return;
  const message = buildQuoteMessage();
  try {
    await navigator.clipboard.writeText(message);
    showToast("Quote text copied");
  } catch (err) {
    showToast("Copy failed — please select the text manually.");
  }
});

// Mobile navigation
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

navToggle.addEventListener("click", function () {
  const open = navMenu.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

navMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", function () {
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
