import {
  canCancel,
  emptyState,
  escapeHtml,
  formatDate,
  formatDateLong,
  formatWhen,
  inr,
  itemsSummary,
  menuCard,
  now,
  ratingSummary,
  slotStartAt,
  stars,
  statusBadge,
  svg,
  totalQty,
} from "../ui.js";

const shortName = (name) => {
  const parts = String(name || "").trim().split(/\s+/);
  if (!parts[0]) return "A student";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

const reviewMatches = (review, orderId, itemId) => review.orderId === orderId && review.itemId === itemId;

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

export function renderHome(ctx) {
  const { menu, orders, featuredId, today, reviews } = ctx.state;
  const featured = menu.find((item) => item.id === featuredId && item.available);
  const featuredRating = featured ? ratingSummary(reviews, featured.id) : { count: 0, avg: 0 };
  const featuredReviews = featured
    ? reviews.filter((review) => review.itemId === featured.id && review.comment).slice(0, 2)
    : [];
  const mealsBooked = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + totalQty(order.items), 0);

  const activeOrders = orders
    .filter((order) => ["Confirmed", "Preparing", "Ready"].includes(order.status) && order.date >= today)
    .map((order) => ({ order, start: slotStartAt(order.date, order.slot) }))
    .sort((a, b) => (a.start ? a.start.getTime() : 0) - (b.start ? b.start.getTime() : 0));
  const upcomingEntry =
    activeOrders.find((entry) => entry.start && entry.start.getTime() > now()) || activeOrders[activeOrders.length - 1];
  const upcoming = upcomingEntry ? upcomingEntry.order : undefined;

  const quickIds = ["m-masala-dosa", "m-samosa", "m-mango-lassi"];
  const quickPicks = quickIds
    .map((id) => menu.find((item) => item.id === id))
    .filter((item) => item && item.available);
  const fallback = menu.filter((item) => item.available).slice(0, 3);
  const picks = (quickPicks.length ? quickPicks : fallback).slice(0, 3);

  return `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Welcome to</p>
        <h1><span class="accent">Canteen Pre-Booking</span>System</h1>
        <p class="hero-sub">Skip the line. Book your favorite meals in advance and pick up hassle-free.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/menu">View Menu</a>
          <a class="btn btn-outline" href="#/orders">My Orders</a>
        </div>
      </div>
      <div class="hero-media">
        <div class="hero-plate">
          <img src="food/thali.jpg" alt="A canteen thali with rice, dal, curry and salad" />
        </div>
        <div class="hero-note">
          <span class="dot"></span>
          <div>
            <strong>${upcoming ? `Next pickup: ${escapeHtml(upcoming.slot)}` : "No upcoming booking"}</strong>
            <small>${mealsBooked} meal${mealsBooked === 1 ? "" : "s"} booked so far</small>
          </div>
        </div>
      </div>
    </section>

    ${
      featured
        ? `<section>
             <div class="section-head">
               <div>
                 <h2 class="section-title">Today's pick</h2>
                 <p class="section-sub">Chosen by the canteen team · ${formatDateLong(today)}</p>
               </div>
               <a class="link-green small" href="#/menu">See the full menu →</a>
             </div>
             <article class="pick-card">
               <div class="pick-media">
                 <img src="${escapeHtml(featured.image)}" alt="${escapeHtml(featured.name)}" />
               </div>
               <div class="pick-body">
                 <span class="pick-label">${svg.star} Today's pick</span>
                 <h3>${escapeHtml(featured.name)}</h3>
                 <p>${escapeHtml(featured.description)}</p>
                 <div class="pick-rating">
                   ${stars(featuredRating.avg)}
                   ${
                     featuredRating.count
                       ? `<b>${featuredRating.avg.toFixed(1)}</b><span class="muted small">${featuredRating.count} review${
                           featuredRating.count === 1 ? "" : "s"
                         }</span>`
                       : `<span class="muted small">No reviews yet</span>`
                   }
                 </div>
                 <div class="pick-foot">
                   <span class="pick-price">${inr(featured.price)}</span>
                   <button class="btn btn-primary" data-action="add-to-cart" data-id="${featured.id}">Add to cart</button>
                   <span class="badge badge-neutral">${escapeHtml(featured.category)}</span>
                   ${featured.canteen ? `<span class="badge badge-neutral">${escapeHtml(featured.canteen)}</span>` : ""}
                 </div>
                 ${
                   featuredReviews.length
                     ? `<div class="pick-reviews">
                          ${featuredReviews
                            .map(
                              (review) => `<div class="pick-review">
                                ${stars(review.rating)}
                                <p>“${escapeHtml(review.comment)}”</p>
                                <span class="tiny muted">— ${escapeHtml(shortName(review.userName))}</span>
                              </div>`
                            )
                            .join("")}
                        </div>`
                     : ""
                 }
               </div>
             </article>
           </section>`
        : ""
    }

    ${
      upcoming
        ? `<section class="card">
             <div class="card-head">
               <h2 class="card-title">Your next booking</h2>
               <a class="link-green small" href="#/orders">All orders →</a>
             </div>
             <div class="card-body">
               <div class="row-between wrap">
                 <div>
                   <div class="row wrap" style="gap:8px">
                     <strong>${escapeHtml(upcoming.code)}</strong>
                     ${statusBadge(upcoming.status)}
                   </div>
                   <p class="small muted" style="margin-top:4px">
                     ${formatDate(upcoming.date)} · ${escapeHtml(upcoming.slot)} · ${escapeHtml(upcoming.counter)}
                   </p>
                   <p class="small" style="margin-top:6px">${escapeHtml(itemsSummary(upcoming.items))}</p>
                 </div>
                 <div class="row">
                   <span class="price">${inr(upcoming.total)}</span>
                   <a class="btn btn-outline btn-sm" href="#/orders">Manage</a>
                 </div>
               </div>
             </div>
           </section>`
        : ""
    }

    <section>
      <div class="section-head">
        <div>
          <h2 class="section-title">Quick picks</h2>
          <p class="section-sub">Popular dishes that are ready in a hurry.</p>
        </div>
        <a class="link-green small" href="#/menu">Full menu →</a>
      </div>
      <div class="menu-grid">
        ${picks
          .map((item) =>
            menuCard(item, {
              featured: item.id === featuredId,
              reviews,
              cartQty: (ctx.state.cart.find((line) => line.itemId === item.id) || {}).qty || 0,
            })
          )
          .join("")}
      </div>
    </section>

    ${renderStudentModal(ctx.state)}`;
}

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

export function renderMenu(ctx) {
  const { menu, categories, counters, ui, user, featuredId, reviews, cart } = ctx.state;
  const staff = user.role === "staff";
  const filter = ui.menuFilter;
  const canteenFilter = ui.menuCanteen || "All";
  const query = (ui.menuQuery || "").trim().toLowerCase();
  const inCanteen = (item) => canteenFilter === "All" || item.canteen === canteenFilter;
  const matchesQuery = (item) =>
    !query ||
    [item.name, item.description, item.category, item.canteen || ""]
      .join(" ")
      .toLowerCase()
      .includes(query);
  const availableCount = (category) =>
    menu.filter(
      (item) => inCanteen(item) && (category === "All" || item.category === category) && item.available
    ).length;
  const items = menu.filter(
    (item) => inCanteen(item) && (filter === "All" || item.category === filter) && matchesQuery(item)
  );
  const cartQty = (id) => (cart.find((line) => line.itemId === id) || {}).qty || 0;

  return `
    <div class="page-head">
      <h1 class="page-title">Menu</h1>
      <p class="page-sub">${
        staff
          ? "Mark dishes sold out as they run out — students see it straight away."
          : "Pick a canteen to see what it serves, or browse everything and collect at each counter."
      }</p>
    </div>

    <div class="menu-toolbar">
      <div class="search-box">
        ${svg.search}
        <input class="input" id="menu-search" type="search" placeholder="Search dishes, categories or canteens"
          value="${escapeHtml(ui.menuQuery || "")}" data-input="menuQuery" aria-label="Search the menu" />
      </div>
      <select class="select select-sm" data-change="menuCanteen" aria-label="Filter menu by canteen">
        <option value="All" ${canteenFilter === "All" ? "selected" : ""}>All canteens · ${menu.length}</option>
        ${counters
          .map((canteen) => {
            const count = menu.filter((item) => item.canteen === canteen).length;
            return `<option value="${escapeHtml(canteen)}" ${
              canteenFilter === canteen ? "selected" : ""
            }>${escapeHtml(canteen)} · ${count}</option>`;
          })
          .join("")}
      </select>
      ${user.role === "admin" ? `<a class="btn btn-outline btn-sm" href="#/admin/menu">Manage menu</a>` : ""}
    </div>

    <div class="pill-row">
      ${
        ["All", ...categories]
          .map(
            (category) => `<button class="pill ${filter === category ? "active" : ""}"
              data-action="filter-menu" data-category="${escapeHtml(category)}">
              ${escapeHtml(category)}<span class="count">${availableCount(category)}</span>
            </button>`
          )
          .join("")
      }
    </div>

    ${
      items.length
        ? `<div class="menu-grid">
             ${items
               .map((item) =>
                 menuCard(item, {
                   staff,
                   featured: item.id === featuredId,
                   reviews,
                   cartQty: cartQty(item.id),
                 })
               )
               .join("")}
           </div>`
        : `<div class="card">${emptyState(
            query ? "No dishes match" : "Nothing here yet",
            query
              ? `Nothing matches “${ui.menuQuery.trim()}”. Try another word or clear the search.`
              : canteenFilter === "All"
              ? "No dishes in this category. Try another filter."
              : `This canteen has nothing in this category. Try all canteens.`
          )}</div>`
    }

    ${renderStudentModal(ctx.state)}`;
}

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

/** Cart lines grouped by the canteen that sells them. */
function cartGroups(state) {
  const groups = new Map();
  state.cart.forEach((line) => {
    const item = state.menu.find((dish) => dish.id === line.itemId);
    if (!item) return;
    const canteen = item.canteen || "Canteen";
    if (!groups.has(canteen)) groups.set(canteen, []);
    groups.get(canteen).push({ item, qty: line.qty });
  });
  return [...groups.entries()].map(([canteen, lines]) => ({
    canteen,
    lines,
    subtotal: lines.reduce((sum, line) => sum + line.item.price * line.qty, 0),
    count: lines.reduce((sum, line) => sum + line.qty, 0),
  }));
}

export function renderCart(ctx) {
  const { state } = ctx;
  const groups = cartGroups(state);
  const total = groups.reduce((sum, group) => sum + group.subtotal, 0);
  const count = groups.reduce((sum, group) => sum + group.count, 0);
  const booking = state.ui.booking;

  const head = `<div class="page-head">
    <h1 class="page-title">Your Cart</h1>
    <p class="page-sub">Review your items, then choose a pickup slot for today.</p>
  </div>`;

  if (!groups.length) {
    return `${head}
      <div class="card">
        ${emptyState(
          "Your cart is empty",
          "Add a dish from the menu to start a pre-booking.",
          `<a class="btn btn-primary btn-sm" href="#/menu">Browse the menu</a>`
        )}
      </div>`;
  }

  return `${head}
    <div class="cart-layout">
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">${count} item${count === 1 ? "" : "s"} in your cart</h2>
          <button class="btn btn-ghost btn-sm" data-action="clear-cart">Clear cart</button>
        </div>
        <div class="cart-row head">
          <span>Item</span><span class="right">Price</span><span class="center-col">Quantity</span>
          <span class="right">Total</span><span></span>
        </div>
        ${groups
          .map(
            (group) => `<div class="cart-group">
              <div class="cart-group-head">
                <strong>${escapeHtml(group.canteen)}</strong>
                <span class="tiny muted">Pick up here · ${inr(group.subtotal)}</span>
              </div>
              ${group.lines
                .map(
                  ({ item, qty }) => `<div class="cart-row">
                    <div class="cart-item">
                      <img class="cart-thumb" src="${escapeHtml(item.image)}" alt="" />
                      <div>
                        <div class="cart-item-name">${escapeHtml(item.name)}</div>
                        <div class="cart-item-meta">${escapeHtml(item.category)}</div>
                      </div>
                    </div>
                    <div class="cart-unit right small muted">${inr(item.price)}</div>
                    <div class="cart-row-qty center-col">
                      <div class="qty">
                        <button data-action="qty-dec" data-id="${item.id}" aria-label="Reduce ${escapeHtml(item.name)}">${svg.minus}</button>
                        <span>${qty}</span>
                        <button data-action="qty-inc" data-id="${item.id}" aria-label="Add another ${escapeHtml(item.name)}">${svg.plus}</button>
                      </div>
                    </div>
                    <div class="cart-amount cart-row-price">${inr(item.price * qty)}</div>
                    <div class="cart-row-remove">
                      <button class="icon-btn" data-action="remove-item" data-id="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">${svg.trash}</button>
                    </div>
                  </div>`
                )
                .join("")}
            </div>`
          )
          .join("")}
        <div class="cart-total">
          <span>Total Amount:</span>
          <strong>${inr(total)}</strong>
        </div>
      </section>

      <aside class="card booking-card">
        <div class="card-head"><h2 class="card-title">Booking Details</h2></div>
        <form class="booking-body" data-form="booking" novalidate>
          <div class="field">
            <span class="label">Pickup day</span>
            <div class="locked-date">${svg.calendar}<span><b>Today</b> · ${formatDateLong(state.today)}</span></div>
            <p class="tiny muted">Bookings are only taken for today.</p>
          </div>
          <div class="field">
            <label class="label" for="book-slot">Time Slot</label>
            <select class="select" id="book-slot" name="slot" data-change="booking">
              ${state.slots
                .map((slot) => {
                  const start = slotStartAt(state.today, slot);
                  const passed = Boolean(start) && start.getTime() <= now();
                  return `<option value="${escapeHtml(slot)}" ${slot === booking.slot ? "selected" : ""} ${
                    passed ? "disabled" : ""
                  }>${escapeHtml(slot)}${passed ? " — passed" : ""}</option>`;
                })
                .join("")}
            </select>
          </div>
          <div class="field">
            <span class="label">Pickup from</span>
            <div class="pickup-list">
              ${groups
                .map(
                  (group) => `<div class="pickup-line">
                    <b>${escapeHtml(group.canteen)}</b>
                    <span class="tiny muted">${group.count} item${group.count === 1 ? "" : "s"} · ${inr(
                      group.subtotal
                    )}</span>
                  </div>`
                )
                .join("")}
            </div>
          </div>
          <div class="booking-total"><span>Total payable</span><strong>${inr(total)}</strong></div>
          <div id="booking-error"></div>
          <button class="btn btn-primary btn-block" type="submit">${
            groups.length > 1 ? `Confirm ${groups.length} bookings` : "Confirm Booking"
          }</button>
          <p class="tiny muted center">${
            groups.length > 1
              ? `${groups.length} canteens prepare their own order — you will get one booking per canteen.`
              : "Pay at the counter when you collect. You can cancel up to 1 hour before your slot."
          }</p>
        </form>
      </aside>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* My orders                                                           */
/* ------------------------------------------------------------------ */

export function renderOrders(ctx) {
  const orders = ctx.state.orders;

  return `
    <div class="page-head">
      <h1 class="page-title">My Orders</h1>
      <p class="page-sub">View all your pre-booked orders.</p>
    </div>

    ${
      orders.length
        ? `<div class="order-cards">
             ${orders
               .map(
                 (order) => `<article class="order-card">
                   <div class="order-card-top">
                     <span class="order-card-code">${escapeHtml(order.code)}</span>
                     ${statusBadge(order.status)}
                   </div>
                   <div class="order-card-meta">
                     <span>${formatDate(order.date)}</span>
                     <span>${escapeHtml(order.slot)}</span>
                     <span>${escapeHtml(order.counter)}</span>
                   </div>
                   <p class="order-card-items">${escapeHtml(itemsSummary(order.items))}</p>
                   <div class="order-card-foot">
                     <strong>${inr(order.total)}</strong>
                     ${orderActions(ctx.state, order)}
                   </div>
                 </article>`
               )
               .join("")}
           </div>
           <div class="table-card orders-table">
             <div class="table-scroll">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Order ID</th><th>Date</th><th>Time Slot</th><th>Items</th>
                     <th class="num">Amount</th><th>Status & actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${orders
                     .map(
                       (order) => `<tr>
                         <td class="order-code">${escapeHtml(order.code)}</td>
                         <td class="nowrap">${formatDate(order.date)}</td>
                         <td class="nowrap">${escapeHtml(order.slot)}</td>
                         <td class="order-items">${escapeHtml(itemsSummary(order.items))}</td>
                         <td class="num strong">${inr(order.total)}</td>
                         <td>
                           <div class="row" style="gap:10px; flex-wrap:wrap">
                             ${statusBadge(order.status)}
                             ${orderActions(ctx.state, order)}
                           </div>
                         </td>
                       </tr>`
                     )
                     .join("")}
                 </tbody>
               </table>
             </div>
             <div class="table-note">
               ${svg.info}
               <span>Orders can be cancelled up to 1 hour before the time slot.</span>
             </div>
           </div>
           <div class="table-note mobile-note">
             ${svg.info}
             <span>Orders can be cancelled up to 1 hour before the time slot.</span>
           </div>`
        : `<div class="card">
             ${emptyState(
               "No bookings yet",
               "Your pre-booked meals will appear here with their pickup slot and status.",
               `<a class="btn btn-primary btn-sm" href="#/menu">Book your first meal</a>`
             )}
           </div>`
    }

    ${renderStudentModal(ctx.state)}`;
}

/* ------------------------------------------------------------------ */
/* Review modals                                                       */
/* ------------------------------------------------------------------ */

function orderActions(state, order) {
  if (order.status === "Completed") {
    const unreviewed = order.items.some(
      (line) => !state.reviews.some((review) => reviewMatches(review, order.id, line.itemId))
    );
    return unreviewed
      ? `<button class="rate-link" data-action="open-rate" data-id="${order.id}">Rate your meal</button>`
      : `<span class="tiny muted">Meal rated ★</span>`;
  }
  return canCancel(order)
    ? `<button class="cancel-link" data-action="cancel-order" data-id="${order.id}"
         data-code="${escapeHtml(order.code)}">Cancel booking</button>`
    : `<span class="tiny muted"></span>`;
}

function renderStudentModal(state) {
  const modal = state.ui.modal;
  if (!modal) return "";
  if (modal.type === "reviews") return dishReviewsModal(state, modal.itemId);
  if (modal.type === "rate") return rateModal(state, modal.orderId);
  return "";
}

function dishReviewsModal(state, itemId) {
  const item = state.menu.find((dish) => dish.id === itemId);
  if (!item) return "";
  const summary = ratingSummary(state.reviews, itemId);
  const list = state.reviews.filter((review) => review.itemId === itemId).slice(0, 8);

  return `<div class="modal-root open" data-action="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="reviews-title">
      <div class="modal-head">
        <div>
          <h3 class="modal-title" id="reviews-title">${escapeHtml(item.name)}</h3>
          <p class="tiny muted">Recent reviews from students who collected this dish.</p>
        </div>
        <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">${svg.x}</button>
      </div>
      <div class="modal-body">
        ${
          summary.count
            ? `<div class="review-summary">
                 <div class="review-score">${summary.avg.toFixed(1)}<span>/5</span></div>
                 <div>${stars(summary.avg)}<div class="tiny muted">${summary.count} review${
                     summary.count === 1 ? "" : "s"
                   }</div></div>
               </div>
               <div class="review-list">
                 ${list
                   .map(
                     (review) => `<article class="review">
                       <div class="review-head">
                         <b>${escapeHtml(shortName(review.userName))}</b>
                         ${stars(review.rating)}
                         <span class="tiny muted">${formatWhen(review.createdAt)}</span>
                       </div>
                       ${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : `<p class="muted">No comment left.</p>`}
                     </article>`
                   )
                   .join("")}
               </div>`
            : `<div class="review-empty">${stars(0)}<p>No one has reviewed ${escapeHtml(
                item.name
              )} yet. Collect it with an order, then share the first rating.</p></div>`
        }
      </div>
      <div class="modal-foot">
        <button type="button" class="btn btn-outline" data-action="close-modal">Close</button>
      </div>
    </div>
  </div>`;
}

function rateModal(state, orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return "";

  return `<div class="modal-root open" data-action="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="rate-title">
      <form data-form="rate" data-order="${escapeHtml(order.id)}" novalidate>
        <div class="modal-head">
          <div>
            <h3 class="modal-title" id="rate-title">Rate ${escapeHtml(order.code)}</h3>
            <p class="tiny muted">Tell the canteen how the food was. Reviews show on the menu for everyone.</p>
          </div>
          <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">${svg.x}</button>
        </div>
        <div class="modal-body rate-list">
          ${order.items
            .map((line) => {
              const existing = state.reviews.find((review) =>
                reviewMatches(review, order.id, line.itemId)
              );
              if (existing) {
                return `<div class="rate-row is-done">
                  <div class="rate-dish"><b>${escapeHtml(line.name)}</b><span class="tiny muted">×${line.qty}</span></div>
                  <div class="rate-given">${stars(existing.rating)}<span class="tiny muted">Rated</span></div>
                  ${existing.comment ? `<p class="rate-comment">“${escapeHtml(existing.comment)}”</p>` : ""}
                </div>`;
              }
              return `<div class="rate-row">
                <div class="rate-dish"><b>${escapeHtml(line.name)}</b><span class="tiny muted">×${line.qty}</span></div>
                <div class="star-input" data-item="${escapeHtml(line.itemId)}" data-value="0"
                  role="group" aria-label="Rating for ${escapeHtml(line.name)}">
                  ${[1, 2, 3, 4, 5]
                    .map(
                      (step) =>
                        `<button type="button" data-action="pick-star" data-value="${step}"
                           aria-label="${step} star${step === 1 ? "" : "s"}">★</button>`
                    )
                    .join("")}
                </div>
                <input class="input" type="text" maxlength="160" data-comment="${escapeHtml(line.itemId)}"
                  placeholder="Short comment (optional)" />
              </div>`;
            })
            .join("")}
          <div id="rate-error"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Submit review</button>
        </div>
      </form>
    </div>
  </div>`;
}
