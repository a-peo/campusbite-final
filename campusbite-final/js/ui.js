// Small view helpers shared by every page (all plain strings + DOM).
export const inr = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));

export const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export const formatDate = (iso) => {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

export const formatDateLong = (iso) => {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

export const itemsSummary = (items) =>
  (items || [])
    .map((item) => (item.qty > 1 ? `${item.name} (${item.qty})` : item.name))
    .join(", ");

export const totalQty = (items) => (items || []).reduce((sum, item) => sum + item.qty, 0);

const STATUS_CLASS = {
  Confirmed: "badge-confirmed",
  Preparing: "badge-preparing",
  Ready: "badge-ready",
  Completed: "badge-completed",
  Cancelled: "badge-cancelled",
};

export const statusBadge = (status) =>
  `<span class="badge ${STATUS_CLASS[status] || "badge-neutral"}">${escapeHtml(status)}</span>`;

/* ---------------- Ratings & reviews ---------------- */
export function ratingSummary(reviews, itemId) {
  const list = (reviews || []).filter((review) => review.itemId === itemId);
  const count = list.length;
  const avg = count ? list.reduce((sum, review) => sum + Number(review.rating || 0), 0) / count : 0;
  return { count, avg };
}

export const stars = (rating) => {
  const filled = Math.round(Number(rating) || 0);
  return `<span class="stars" aria-hidden="true">${[1, 2, 3, 4, 5]
    .map((step) => `<span class="${step <= filled ? "on" : ""}">★</span>`)
    .join("")}</span>`;
};

export const formatWhen = (iso) => {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "A student";

export const roleBadge = (role) =>
  `<span class="badge badge-role ${escapeHtml(role)}">${escapeHtml(role)}</span>`;

export const ROLE_LABEL = { student: "Student", staff: "Staff", admin: "Admin" };

export const homeHref = (role) =>
  role === "admin" ? "#/admin" : role === "staff" ? "#/queue" : "#/";

export const NAV = {
  student: [
    { href: "#/", label: "Home", match: [""] },
    { href: "#/menu", label: "Menu", match: ["menu"] },
    { href: "#/orders", label: "My Orders", match: ["orders"] },
    { href: "#/profile", label: "Profile", match: ["profile"] },
  ],
  staff: [
    { href: "#/queue", label: "Queue", match: ["queue"] },
    { href: "#/menu", label: "Menu", match: ["menu"] },
    { href: "#/profile", label: "Profile", match: ["profile"] },
  ],
  admin: [
    { href: "#/admin", label: "Overview", match: ["admin"] },
    { href: "#/admin/menu", label: "Menu", match: ["admin/menu"] },
    { href: "#/admin/orders", label: "Orders", match: ["admin/orders"] },
    { href: "#/admin/reviews", label: "Reviews", match: ["admin/reviews"] },
    { href: "#/admin/counters", label: "Canteens", match: ["admin/counters"] },
    { href: "#/admin/users", label: "Users", match: ["admin/users"] },
    { href: "#/profile", label: "Profile", match: ["profile"] },
  ],
};

/* ---------------- When can a student cancel? ---------------- */
export function slotStartAt(isoDate, slot) {
  const match = String(slot || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  const [year, month, day] = String(isoDate || "").split("-").map(Number);
  if (!match || !year) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return new Date(year, month - 1, day, hour, Number(match[2]), 0, 0);
}

export function slotStart(order) {
  return slotStartAt(order.date, order.slot);
}

// The server is the source of truth for "now" (the browser may be in another timezone).
let clockOffset = 0;

export function setClockOffset(offsetMs) {
  clockOffset = Number(offsetMs) || 0;
}

export function now() {
  return Date.now() + clockOffset;
}

export function canCancel(order) {
  const start = slotStartAt(order.date, order.slot);
  return Boolean(start) && order.status === "Confirmed" && start.getTime() - now() > 60 * 60 * 1000;
}

/* ---------------- Toast ---------------- */
export function toast(title, message = "", tone = "success") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const element = document.createElement("div");
  element.className = `toast ${tone}`;
  element.innerHTML = `<span class="toast-dot"></span><div><strong>${escapeHtml(title)}</strong>${
    message ? `<span>${escapeHtml(message)}</span>` : ""
  }</div>`;
  root.appendChild(element);
  setTimeout(() => {
    element.classList.add("out");
    setTimeout(() => element.remove(), 220);
  }, 3400);
}

/* ---------------- Reusable blocks ---------------- */
export function statCard({ label, value, hint, icon }) {
  return `<div class="stat-card">
    <div class="stat-top">
      <span class="stat-label">${escapeHtml(label)}</span>
      <span class="stat-icon">${icon || svg.grid}</span>
    </div>
    <div class="stat-value">${value}</div>
    ${hint ? `<div class="stat-hint">${escapeHtml(hint)}</div>` : ""}
  </div>`;
}

export function emptyState(title, message, action = "") {
  return `<div class="empty">
    <div class="empty-icon">${svg.bag}</div>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
    ${action}
  </div>`;
}

export function menuCard(item, { staff = false, featured = false, reviews = [], cartQty = 0 } = {}) {
  const summary = ratingSummary(reviews, item.id);
  const ratingLine = summary.count
    ? `<button type="button" class="rating-line" data-action="dish-reviews" data-id="${escapeHtml(item.id)}"
         aria-label="Read ${summary.count} reviews of ${escapeHtml(item.name)}">
         ${stars(summary.avg)}<b>${summary.avg.toFixed(1)}</b><span>(${summary.count})</span>
       </button>`
    : `<span class="rating-line is-empty">${stars(0)}<span>No reviews yet</span></span>`;

  return `<article class="menu-card ${item.available ? "" : "is-out"}">
    <div class="menu-media">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
      ${featured ? `<span class="feature-tag">${svg.star} Today's pick</span>` : ""}
      ${item.available ? "" : `<span class="sold-out-tag">Sold out</span>`}
    </div>
    <div class="menu-body">
      <div class="menu-meta">
        <span class="veg-dot ${item.veg ? "" : "nonveg"}"></span>
        <span>${escapeHtml(item.category)}</span>
        ${item.canteen ? `<span class="canteen-tag">${escapeHtml(item.canteen)}</span>` : ""}
      </div>
      <h3 class="menu-name">${escapeHtml(item.name)}</h3>
      <p class="menu-desc">${escapeHtml(item.description)}</p>
      ${staff ? "" : ratingLine}
      <div class="menu-foot">
        <span class="price">${inr(item.price)}</span>
        ${
          staff
            ? `<div class="menu-staff-actions">
                 <label class="switch">
                   <input type="checkbox" data-change="availability" data-id="${escapeHtml(item.id)}" ${
                     item.available ? "checked" : ""
                   } />
                   <span class="switch-track"></span>
                   <span class="switch-label">${item.available ? "In stock" : "Sold out"}</span>
                 </label>
                 <button class="btn btn-outline btn-xs" data-action="edit-item" data-id="${escapeHtml(
                   item.id
                 )}">Edit</button>
               </div>`
            : `<button class="btn btn-primary btn-xs add-btn" data-action="add-to-cart" data-id="${escapeHtml(
                item.id
              )}" ${item.available ? "" : "disabled"}>Add${
                cartQty
                  ? `<span class="add-count" aria-label="${cartQty} in cart">${cartQty}</span>`
                  : ""
              }</button>`
        }
      </div>
    </div>
  </article>`;
}

/* ---------------- Chrome ---------------- */
export function renderHeader(user, cartCount, path, navOpen) {
  const items = NAV[user.role] || [];
  const links = (extraClass = "") =>
    items
      .map(
        (item) =>
          `<a class="${extraClass} ${item.match.includes(path) ? "active" : ""}" href="${item.href}">${item.label}</a>`
      )
      .join("");

  const cartLink =
    user.role === "student"
      ? `<a class="cart-btn" href="#/cart" aria-label="Cart, ${cartCount} items">${svg.bag}${
          cartCount ? `<span class="cart-count">${cartCount}</span>` : ""
        }</a>`
      : "";

  return `<header class="site-header role-${user.role}">
    <div class="container header-inner">
      <a class="brand" href="${homeHref(user.role)}">
        <span class="brand-mark">${svg.utensils}</span>
        <span class="brand-text">Canteen Pre-Booking System</span>
      </a>
      <nav class="main-nav">${links("nav-link")}</nav>
      <div class="header-actions">
        ${cartLink}
        <div class="user-chip">
          <span class="avatar">${initials(user.name)}</span>
          <span class="user-meta"><strong>${escapeHtml(user.name)}</strong><small>${ROLE_LABEL[user.role] || user.role}</small></span>
        </div>
        <button class="btn btn-primary btn-sm logout-btn" data-action="logout">Logout</button>
        <button class="nav-toggle" data-action="toggle-nav" aria-label="Toggle navigation" aria-expanded="${
          navOpen ? "true" : "false"
        }">${svg.menuIcon}</button>
      </div>
    </div>
    <div class="mobile-nav ${navOpen ? "open" : ""}">
      ${links("")}
      <a href="#" data-action="logout">${svg.logout} Logout</a>
    </div>
  </header>`;
}

export function renderFooter() {
  return `<footer class="site-footer">
    <div class="container footer-inner">
      <span>© ${new Date().getFullYear()} Campus Canteen · Pre-booking demo</span>
      <div class="footer-links">
        <span>Pay at the counter on pickup</span>
        <span>Food photos: Wikimedia Commons</span>
      </div>
    </div>
  </footer>`;
}

/* ---------------- Inline icons ---------------- */
export const svg = {
  utensils: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v7a2 2 0 0 0 4 0V3"/><path d="M8 10v11"/><path d="M18 3c-2 2.2-2 6.8 0 9v9"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l-1.2 12H7.2L6 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5.2 20c.7-3.4 3.4-5.4 6.8-5.4s6.1 2 6.8 5.4"/></svg>`,
  menuIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6.5 7l.8 12h9.4l.8-12"/><path d="M10.5 11v5M13.5 11v5"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.6l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.9" r=".9" fill="currentColor" stroke="none"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg>`,
  list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.2" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="18" r="1.1" fill="currentColor" stroke="none"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3 2.9-4.7 5.5-4.7s4.9 1.7 5.5 4.7"/><path d="M16 5.6a3 3 0 0 1 0 5.9"/><path d="M17.4 14.9c1.8.5 3 2.1 3.4 4.3"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 8l4 4-4 4"/><path d="M19 12H9"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 8h12v6.5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5V8Z"/><path d="M16.5 9.5h1.8a2.7 2.7 0 0 1 0 5.4h-1.8"/><path d="M7 3.5c0 1-1 1.5-1 2.5"/></svg>`,
  rupee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10M7 8.5h10"/><path d="M7 4h3.5a4.5 4.5 0 0 1 0 9H7l6 7"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4Z"/></svg>`,
};
