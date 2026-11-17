import { request, session } from "./api.js";
import {
  escapeHtml,
  now,
  renderFooter,
  renderHeader,
  setClockOffset,
  slotStartAt,
  toast,
} from "./ui.js";
import { renderLogin } from "./pages/auth.js";
import { renderCart, renderHome, renderMenu, renderOrders } from "./pages/student.js";
import { renderQueue } from "./pages/staff.js";
import {
  renderAdminCounters,
  renderAdminMenu,
  renderAdminOrders,
  renderAdminOverview,
  renderAdminReviews,
  renderAdminUsers,
} from "./pages/admin.js";
import { renderProfile } from "./pages/profile.js";

const state = {
  user: null,
  menu: [],
  orders: [],
  reviews: [],
  users: [],
  featuredId: "",
  slots: [],
  counters: [],
  categories: [],
  statuses: [],
  today: "",
  cart: [],
  ui: {
    route: "",
    loginRole: "student",
    menuFilter: "All",
    menuCanteen: "All",
    menuQuery: "",
    adminMenuQuery: "",
    queueFilter: "All",
    queueQuery: "",
    adminOrderQuery: "",
    adminOrderStatus: "All",
    adminOrderDate: "all",
    navOpen: false,
    modal: null,
    booking: { slot: "" },
  },
};

const ctx = () => ({ state, user: state.user, ui: state.ui, navigate, refresh, toast });

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

function currentPath() {
  return location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
}

function roleHome() {
  if (!state.user) return "login";
  if (state.user.role === "staff") return "queue";
  if (state.user.role === "admin") return "admin";
  return "";
}

function navigate(target) {
  const hash = `#/${target}`;
  if (location.hash === hash) {
    render();
  } else {
    location.hash = hash;
  }
}

function pickView(path) {
  const role = state.user.role;
  if (path === "profile") return () => renderProfile(ctx());
  if (path === "menu") return () => (role === "staff" ? renderAdminMenu(ctx()) : renderMenu(ctx()));

  if (role === "student") {
    if (path === "") return () => renderHome(ctx());
    if (path === "cart") return () => renderCart(ctx());
    if (path === "orders") return () => renderOrders(ctx());
    return null;
  }
  if (role === "staff") {
    if (path === "queue") return () => renderQueue(ctx());
    return null;
  }
  if (role === "admin") {
    if (path === "admin") return () => renderAdminOverview(ctx());
    if (path === "admin/menu") return () => renderAdminMenu(ctx());
    if (path === "admin/orders") return () => renderAdminOrders(ctx());
    if (path === "admin/reviews") return () => renderAdminReviews(ctx());
    if (path === "admin/counters") return () => renderAdminCounters(ctx());
    if (path === "admin/users") return () => renderAdminUsers(ctx());
    return null;
  }
  return null;
}

let lastRoute = null;

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  const path = currentPath();
  state.ui.route = path;

  if (!state.user) {
    app.innerHTML = renderLogin(ctx());
    return;
  }

  const home = roleHome();
  if (path === "login" || (path === "" && home !== "")) {
    navigate(home);
    return;
  }

  const view = pickView(path);
  if (!view) {
    navigate(home);
    return;
  }

  app.innerHTML = `<div class="app-shell">
    ${renderHeader(state.user, cartCount(), path, state.ui.navOpen)}
    <main class="main"><div class="container">${view()}</div></main>
    ${renderFooter()}
  </div>`;

  if (lastRoute !== path) {
    window.scrollTo({ top: 0, behavior: "auto" });
    lastRoute = path;
  }
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

function cartKey() {
  return `canteen.cart.${state.user ? state.user.id : "guest"}`;
}

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(cartKey()) || "[]");
    state.cart = Array.isArray(raw)
      ? raw.filter((line) => line && typeof line.itemId === "string" && Number(line.qty) > 0)
      : [];
  } catch (error) {
    state.cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(cartKey(), JSON.stringify(state.cart));
  } catch (error) {
    /* ignore storage errors */
  }
}

function cartCount() {
  return state.cart.reduce((sum, line) => sum + Number(line.qty || 0), 0);
}

function defaultBooking() {
  const next = state.slots.find((slot) => {
    const start = slotStartAt(state.today, slot);
    return start && start.getTime() > now();
  });
  return { slot: next || state.slots[0] || "" };
}

async function loadState() {
  const data = await request("/state");
  state.user = data.user;
  state.menu = data.menu || [];
  state.orders = data.orders || [];
  state.reviews = data.reviews || [];
  state.users = data.users || [];
  state.statuses = data.statuses || [];
  state.featuredId = data.featuredId || "";
  state.slots = data.slots || [];
  state.counters = data.counters || [];
  state.categories = data.categories || [];
  state.today = data.today || "";
  // Slot times are canteen-local, so compare against the server's wall clock, not the browser's timezone.
  const serverWallClock = data.serverLocalTime ? new Date(data.serverLocalTime) : null;
  setClockOffset(
    serverWallClock && !Number.isNaN(serverWallClock.getTime()) ? serverWallClock.getTime() - Date.now() : 0
  );

  const fallback = defaultBooking();
  const chosenStart = slotStartAt(state.today, state.ui.booking.slot);
  if (!state.ui.booking.slot || !state.slots.includes(state.ui.booking.slot) || !chosenStart || chosenStart.getTime() <= now()) {
    state.ui.booking.slot = fallback.slot;
  }
  loadCart();
}

async function refresh() {
  try {
    await loadState();
    render();
  } catch (error) {
    handleError(error);
  }
}

function handleError(error) {
  if (error.status === 401) {
    session.token = "";
    state.user = null;
    render();
    toast("Session ended", "Please sign in again.", "error");
    return;
  }
  toast("That did not work", error.message || "Please try again.", "error");
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

async function submitLogin(form) {
  const email = String(form.email.value || "").trim();
  const password = String(form.password.value || "");
  const errorBox = document.getElementById("login-error");
  const submit = form.querySelector('button[type="submit"]');

  if (!email || !password) {
    errorBox.innerHTML = `<div class="form-error">Enter your email and password.</div>`;
    return;
  }

  errorBox.innerHTML = "";
  submit.disabled = true;
  try {
    const data = await request("/login", { method: "POST", body: { email, password } });
    session.token = data.token;
    state.ui.booking = { slot: "" };
    await loadState();
    toast(`Welcome, ${state.user.name.split(" ")[0]}!`, `Signed in as ${state.user.role}.`);
    navigate(roleHome());
  } catch (error) {
    errorBox.innerHTML = `<div class="form-error">${escapeHtml(error.message)}</div>`;
    submit.disabled = false;
  }
}

async function logout() {
  try {
    await request("/logout", { method: "POST" });
  } catch (error) {
    /* the token is cleared locally anyway */
  }
  session.token = "";
  state.user = null;
  state.cart = [];
  state.ui.modal = null;
  state.ui.navOpen = false;
  state.ui.loginRole = "student";
  lastRoute = null;
  location.hash = "#/login";
  render();
}

/* ------------------------------------------------------------------ */
/* Cart                                                               */
/* ------------------------------------------------------------------ */

function addToCart(itemId) {
  const item = state.menu.find((dish) => dish.id === itemId);
  if (!item) return;
  if (!item.available) {
    toast("Sold out", `${item.name} is not available right now.`, "error");
    return;
  }
  const line = state.cart.find((entry) => entry.itemId === itemId);
  if (line) {
    line.qty = Math.min(20, line.qty + 1);
  } else {
    state.cart.push({ itemId, qty: 1 });
  }
  saveCart();
  render();
  toast("Added to cart", `${item.name} · ₹${item.price}`);
}

function changeQty(itemId, delta) {
  const line = state.cart.find((entry) => entry.itemId === itemId);
  if (!line) return;
  line.qty = Math.min(20, line.qty + delta);
  if (line.qty <= 0) {
    state.cart = state.cart.filter((entry) => entry.itemId !== itemId);
  }
  saveCart();
  render();
}

function removeItem(itemId) {
  const item = state.menu.find((dish) => dish.id === itemId);
  state.cart = state.cart.filter((entry) => entry.itemId !== itemId);
  saveCart();
  render();
  if (item) toast("Removed from cart", item.name);
}

function clearCart() {
  state.cart = [];
  saveCart();
  render();
  toast("Cart cleared", "Your cart is empty again.");
}

/* ------------------------------------------------------------------ */
/* Orders                                                             */
/* ------------------------------------------------------------------ */

async function submitBooking(form) {
  const booking = {
    date: state.today,
    slot: form.slot.value,
  };
  state.ui.booking = { slot: booking.slot };
  const items = state.cart.map((line) => ({ itemId: line.itemId, qty: line.qty }));
  const errorBox = document.getElementById("booking-error");
  const submit = form.querySelector('button[type="submit"]');

  if (!items.length) {
    toast("Cart is empty", "Add something from the menu first.", "error");
    return;
  }

  const slotStart = slotStartAt(booking.date, booking.slot);
  if (!slotStart || slotStart.getTime() <= now()) {
    errorBox.innerHTML = `<div class="form-error">That time slot has already started. Pick a later slot today.</div>`;
    return;
  }

  errorBox.innerHTML = "";
  submit.disabled = true;
  try {
    const response = await request("/orders", {
      method: "POST",
      body: { ...booking, items },
    });
    const bookings = response.orders && response.orders.length ? response.orders : [response.order];
    state.cart = [];
    saveCart();
    await loadState();
    toast(
      bookings.length > 1 ? `${bookings.length} bookings confirmed` : "Booking confirmed",
      `${bookings.map((order) => order.code).join(" + ")} · ${bookings[0].slot} · ${bookings
        .map((order) => order.counter)
        .join(", ")}.`
    );
    navigate("orders");
  } catch (error) {
    errorBox.innerHTML = `<div class="form-error">${escapeHtml(error.message)}</div>`;
    submit.disabled = false;
  }
}

async function cancelOrder(id, code) {
  const label = code || "this booking";
  if (!window.confirm(`Cancel ${label}? This cannot be undone.`)) return;
  try {
    await request(`/orders/${id}/cancel`, { method: "POST" });
    await loadState();
    render();
    toast("Booking cancelled", `${label} has been cancelled.`);
  } catch (error) {
    handleError(error);
  }
}

async function updateOrderStatus(id, status, code) {
  try {
    await request(`/orders/${id}/status`, { method: "PUT", body: { status } });
    await loadState();
    render();
    toast("Order updated", `${code || "Order"} is now ${status.toLowerCase()}.`);
  } catch (error) {
    handleError(error);
    render();
  }
}

/* ------------------------------------------------------------------ */
/* Menu management                                                    */
/* ------------------------------------------------------------------ */

async function setAvailability(itemId, available) {
  try {
    await request(`/menu/${itemId}/availability`, { method: "PUT", body: { available } });
    await loadState();
    render();
    const item = state.menu.find((dish) => dish.id === itemId);
    toast(available ? "Back in stock" : "Marked sold out", item ? item.name : "");
  } catch (error) {
    handleError(error);
    render();
  }
}

async function setFeatured(itemId, name) {
  try {
    await request(`/menu/${itemId}/featured`, { method: "PUT" });
    await loadState();
    render();
    toast("Today's pick updated", `${name} is now today's pick.`);
  } catch (error) {
    handleError(error);
  }
}

async function deleteItem(itemId, name) {
  if (!window.confirm(`Remove ${name} from the menu?`)) return;
  try {
    await request(`/menu/${itemId}`, { method: "DELETE" });
    await loadState();
    render();
    toast("Item removed", `${name} is no longer on the menu.`);
  } catch (error) {
    handleError(error);
  }
}

async function saveMenuItem(form) {
  const data = new FormData(form);
  const id = String(data.get("id") || "");
  const payload = {
    name: String(data.get("name") || "").trim(),
    price: Number(data.get("price")),
    category: String(data.get("category") || ""),
    canteen: String(data.get("canteen") || ""),
    image: String(data.get("image") || ""),
    description: String(data.get("description") || "").trim(),
    veg: data.get("veg") === "on",
    available: data.get("available") === "on",
  };
  const errorBox = document.getElementById("menu-error");

  try {
    if (id) {
      await request(`/menu/${id}`, { method: "PUT", body: payload });
    } else {
      await request("/menu", { method: "POST", body: payload });
    }
    state.ui.modal = null;
    await loadState();
    render();
    toast(id ? "Item updated" : "Item added", payload.name);
  } catch (error) {
    if (errorBox) errorBox.innerHTML = `<div class="form-error">${escapeHtml(error.message)}</div>`;
  }
}

/* ------------------------------------------------------------------ */
/* Profile                                                            */
/* ------------------------------------------------------------------ */

async function saveProfile(form) {
  const data = new FormData(form);
  const errorBox = document.getElementById("profile-error");
  try {
    const response = await request("/profile", {
      method: "PUT",
      body: { phone: String(data.get("phone") || "").trim() },
    });
    state.user = response.user;
    await loadState();
    render();
    toast("Profile saved", "Your phone number was updated.");
  } catch (error) {
    if (errorBox) errorBox.innerHTML = `<div class="form-error">${escapeHtml(error.message)}</div>`;
  }
}

async function savePassword(form) {
  const data = new FormData(form);
  const errorBox = document.getElementById("password-error");
  const submit = form.querySelector('button[type="submit"]');
  if (errorBox) errorBox.innerHTML = "";
  submit.disabled = true;
  try {
    await request("/password", {
      method: "PUT",
      body: {
        currentPassword: String(data.get("currentPassword") || ""),
        newPassword: String(data.get("newPassword") || ""),
      },
    });
    form.reset();
    toast("Password changed", "Use your new password the next time you sign in.");
  } catch (error) {
    if (errorBox) errorBox.innerHTML = `<div class="form-error">${escapeHtml(error.message)}</div>`;
  } finally {
    submit.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* Reviews                                                            */
/* ------------------------------------------------------------------ */

async function submitReviews(form) {
  const orderId = form.dataset.order;
  const errorBox = document.getElementById("rate-error");
  const groups = [...form.querySelectorAll(".star-input")];
  const submit = form.querySelector('button[type="submit"]');
  const pending = groups
    .map((group) => ({
      itemId: group.dataset.item,
      rating: Number(group.dataset.value || 0),
      comment: (form.querySelector(`[data-comment="${group.dataset.item}"]`) || {}).value || "",
    }))
    .filter((entry) => entry.rating > 0);

  if (!pending.length) {
    if (errorBox) errorBox.innerHTML = `<div class="form-error">Tap the stars to rate at least one dish.</div>`;
    return;
  }

  if (errorBox) errorBox.innerHTML = "";
  submit.disabled = true;
  try {
    for (const entry of pending) {
      await request("/reviews", {
        method: "POST",
        body: { orderId, itemId: entry.itemId, rating: entry.rating, comment: entry.comment.trim() },
      });
    }
    state.ui.modal = null;
    await loadState();
    render();
    toast("Thanks for the review", "Your rating now shows on the menu for everyone.");
  } catch (error) {
    if (errorBox) errorBox.innerHTML = `<div class="form-error">${escapeHtml(error.message)}</div>`;
    submit.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* Admin: accounts, counters, reviews                                 */
/* ------------------------------------------------------------------ */

async function setUserActive(userId, active, name) {
  if (!active && !window.confirm(`Revoke ${name}'s access? They will be signed out and cannot sign in again.`)) {
    return;
  }
  try {
    await request(`/users/${userId}/status`, { method: "PUT", body: { active } });
    await loadState();
    render();
    toast(active ? "Access restored" : "Account revoked", name);
  } catch (error) {
    handleError(error);
  }
}

async function deleteUser(userId, name) {
  if (!window.confirm(`Delete ${name}'s account permanently? Their past orders stay in the records.`)) return;
  try {
    await request(`/users/${userId}`, { method: "DELETE" });
    await loadState();
    render();
    toast("Account deleted", `${name} can no longer sign in.`);
  } catch (error) {
    handleError(error);
  }
}

async function deleteReview(reviewId) {
  if (!window.confirm("Remove this review? It will disappear from the menu.")) return;
  try {
    await request(`/reviews/${reviewId}`, { method: "DELETE" });
    await loadState();
    render();
    toast("Review removed", "The rating was taken down from the dish.");
  } catch (error) {
    handleError(error);
  }
}

async function addCounter(form) {
  const name = String(form.counterName.value || "").trim();
  const errorBox = document.getElementById("counter-error");
  if (!name) {
    if (errorBox) errorBox.innerHTML = `<div class="form-error">Give the canteen counter a name.</div>`;
    return;
  }
  try {
    await request("/counters", { method: "POST", body: { name } });
    await loadState();
    render();
    toast("Counter added", `${name} is now available for bookings.`);
  } catch (error) {
    if (errorBox) errorBox.innerHTML = `<div class="form-error">${escapeHtml(error.message)}</div>`;
  }
}

async function saveUser(form) {
  const data = new FormData(form);
  const errorBox = document.getElementById("user-error");
  const submit = form.querySelector('button[type="submit"]');
  const id = String(data.get("id") || "");
  const payload = {
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    password: String(data.get("password") || ""),
    role: String(data.get("role") || "student"),
    rollNo: String(data.get("rollNo") || "").trim(),
    department: String(data.get("department") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    canteen: String(data.get("canteen") || ""),
  };

  if (errorBox) errorBox.innerHTML = "";
  submit.disabled = true;
  try {
    await request(id ? `/users/${id}` : "/users", { method: id ? "PUT" : "POST", body: payload });
    state.ui.modal = null;
    await loadState();
    render();
    toast(id ? "Account updated" : "Account created", `${payload.name} · ${payload.role}`);
  } catch (error) {
    if (errorBox) errorBox.innerHTML = `<div class="form-error">${escapeHtml(error.message)}</div>`;
    submit.disabled = false;
  }
}

async function removeCounter(name) {
  if (!window.confirm(`Remove the ${name} pickup counter?`)) return;
  try {
    await request(`/counters/${encodeURIComponent(name)}`, { method: "DELETE" });
    await loadState();
    render();
    toast("Counter removed", `${name} is no longer offered at booking.`);
  } catch (error) {
    handleError(error);
  }
}

/* ------------------------------------------------------------------ */
/* Events                                                             */
/* ------------------------------------------------------------------ */

function rerenderPreservingFocus() {
  const active = document.activeElement;
  const id = active && active.id;
  const start =
    active && typeof active.selectionStart === "number" ? active.selectionStart : null;
  render();
  if (!id) return;
  const element = document.getElementById(id);
  if (!element) return;
  element.focus();
  if (start !== null && typeof element.setSelectionRange === "function") {
    try {
      element.setSelectionRange(start, start);
    } catch (error) {
      /* some input types do not support selection */
    }
  }
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case "logout":
      event.preventDefault();
      await logout();
      return;
    case "toggle-nav":
      state.ui.navOpen = !state.ui.navOpen;
      render();
      return;
    case "select-role":
      state.ui.loginRole = target.dataset.role;
      render();
      return;
    case "add-to-cart":
      addToCart(target.dataset.id);
      return;
    case "qty-inc":
      changeQty(target.dataset.id, 1);
      return;
    case "qty-dec":
      changeQty(target.dataset.id, -1);
      return;
    case "remove-item":
      removeItem(target.dataset.id);
      return;
    case "clear-cart":
      clearCart();
      return;
    case "filter-menu":
      state.ui.menuFilter = target.dataset.category;
      render();
      return;
    case "filter-queue":
      state.ui.queueFilter = target.dataset.status;
      render();
      return;
    case "refresh":
      toast("Refreshing", "Fetching the latest orders.");
      await refresh();
      return;
    case "cancel-order":
      await cancelOrder(target.dataset.id, target.dataset.code);
      return;
    case "order-status":
      await updateOrderStatus(target.dataset.id, target.dataset.status, target.dataset.code);
      return;
    case "open-add-item":
      state.ui.modal = { type: "menu", itemId: null };
      render();
      return;
    case "edit-item":
      state.ui.modal = { type: "menu", itemId: target.dataset.id };
      render();
      return;
    case "close-modal":
      state.ui.modal = null;
      render();
      return;
    case "modal-backdrop":
      if (event.target === target) {
        state.ui.modal = null;
        render();
      }
      return;
    case "set-featured":
      await setFeatured(target.dataset.id, target.dataset.name);
      return;
    case "delete-item":
      await deleteItem(target.dataset.id, target.dataset.name);
      return;
    case "dish-reviews":
      state.ui.modal = { type: "reviews", itemId: target.dataset.id };
      render();
      return;
    case "open-rate":
      state.ui.modal = { type: "rate", orderId: target.dataset.id };
      render();
      return;
    case "pick-star": {
      const group = target.closest(".star-input");
      if (!group) return;
      const value = Number(target.dataset.value || 0);
      group.dataset.value = String(value);
      [...group.querySelectorAll("button")].forEach((button) => {
        button.classList.toggle("on", Number(button.dataset.value) <= value);
      });
      return;
    }
    case "revoke-user":
      await setUserActive(target.dataset.id, false, target.dataset.name);
      return;
    case "activate-user":
      await setUserActive(target.dataset.id, true, target.dataset.name);
      return;
    case "delete-user":
      await deleteUser(target.dataset.id, target.dataset.name);
      return;
    case "delete-review":
      await deleteReview(target.dataset.id);
      return;
    case "remove-counter":
      await removeCounter(target.dataset.name);
      return;
    case "open-add-user":
      state.ui.modal = { type: "user", userId: null };
      render();
      return;
    case "open-edit-user":
      state.ui.modal = { type: "user", userId: target.dataset.id };
      render();
      return;
    case "reset-order-filters":
      state.ui.adminOrderQuery = "";
      state.ui.adminOrderStatus = "All";
      state.ui.adminOrderDate = "all";
      render();
      return;
    default:
      return;
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  const kind = form.dataset.form;
  if (kind === "login") await submitLogin(form);
  else if (kind === "booking") await submitBooking(form);
  else if (kind === "profile") await saveProfile(form);
  else if (kind === "menu-item") await saveMenuItem(form);
  else if (kind === "rate") await submitReviews(form);
  else if (kind === "counter") await addCounter(form);
  else if (kind === "new-user") await saveUser(form);
  else if (kind === "password") await savePassword(form);
});

document.addEventListener("change", async (event) => {
  const target = event.target.closest("[data-change]");
  if (!target) return;
  const kind = target.dataset.change;

  if (kind === "booking") {
    state.ui.booking[target.name] = target.value;
    return;
  }
  if (kind === "menuCanteen") {
    state.ui.menuCanteen = target.value;
    render();
    return;
  }
  if (kind === "availability") {
    await setAvailability(target.dataset.id, target.checked);
    return;
  }
  if (kind === "order-status") {
    await updateOrderStatus(target.dataset.id, target.value, target.dataset.code);
    return;
  }
  if (kind === "adminOrderStatus") {
    state.ui.adminOrderStatus = target.value;
    render();
    return;
  }
  if (kind === "adminOrderDate") {
    state.ui.adminOrderDate = target.value;
    render();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target.closest("[data-input]");
  if (!target) return;
  const key = target.dataset.input;
  if (key === "queueQuery") state.ui.queueQuery = target.value;
  else if (key === "menuQuery") state.ui.menuQuery = target.value;
  else if (key === "adminMenuQuery") state.ui.adminMenuQuery = target.value;
  else if (key === "adminOrderQuery") state.ui.adminOrderQuery = target.value;
  else return;
  rerenderPreservingFocus();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (state.ui.modal) {
    state.ui.modal = null;
    render();
  } else if (state.ui.navOpen) {
    state.ui.navOpen = false;
    render();
  }
});

window.addEventListener("hashchange", () => {
  state.ui.navOpen = false;
  render();
});

/* ------------------------------------------------------------------ */
/* Boot                                                               */
/* ------------------------------------------------------------------ */

async function boot() {
  if (!location.hash) {
    history.replaceState(null, "", "#/");
  }
  if (session.token) {
    try {
      await loadState();
    } catch (error) {
      if (error.status === 401) {
        session.token = "";
        state.user = null;
      } else {
        toast("Cannot reach the canteen", error.message, "error");
      }
    }
  }
  render();
}

boot();
