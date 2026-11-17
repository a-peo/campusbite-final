import {
  emptyState,
  escapeHtml,
  formatDate,
  formatDateLong,
  formatWhen,
  inr,
  initials,
  itemsSummary,
  ratingSummary,
  roleBadge,
  stars,
  statusBadge,
  svg,
  totalQty,
} from "../ui.js";

const IMAGE_OPTIONS = [
  ["food/idli-sambar.jpg", "Idli Sambar"],
  ["food/paneer-paratha.jpg", "Paneer Paratha"],
  ["food/masala-dosa.jpg", "Masala Dosa"],
  ["food/vada-pav.jpg", "Vada Pav"],
  ["food/upma.jpg", "Upma"],
  ["food/chole-bhature.jpg", "Chole Bhature"],
  ["food/veg-fried-rice.jpg", "Veg Fried Rice"],
  ["food/veg-biryani.jpg", "Veg Biryani"],
  ["food/veg-pulao.jpg", "Veg Pulao"],
  ["food/curd-rice.jpg", "Curd Rice"],
  ["food/pav-bhaji.jpg", "Pav Bhaji"],
  ["food/aloo-sandwich.jpg", "Aloo Sandwich"],
  ["food/samosa.jpg", "Samosa"],
  ["food/gulab-jamun.jpg", "Gulab Jamun"],
  ["food/lemon-tea.jpg", "Lemon Tea"],
  ["food/filter-coffee.jpg", "Filter Coffee"],
  ["food/masala-chai.jpg", "Masala Chai"],
  ["food/cold-coffee.jpg", "Cold Coffee"],
  ["food/mango-lassi.jpg", "Mango Lassi"],
  ["food/thali.jpg", "Canteen Thali"],
];

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export function renderAdminOverview(ctx) {
  const { orders, menu, today, featuredId, slots, users } = ctx.state;
  const todays = orders.filter((order) => order.date === today);
  const active = todays.filter((order) => order.status !== "Cancelled");
  const revenue = active.reduce((sum, order) => sum + order.total, 0);
  const plates = active.reduce((sum, order) => sum + totalQty(order.items), 0);
  const cancelled = todays.filter((order) => order.status === "Cancelled").length;

  const slotCounts = slots.map((slot) => ({ slot, count: active.filter((order) => order.slot === slot).length }));
  const busiest = Math.max(1, ...slotCounts.map((entry) => entry.count));

  const itemTotals = new Map();
  active.forEach((order) =>
    order.items.forEach((item) => {
      const entry = itemTotals.get(item.itemId) || { qty: 0, revenue: 0 };
      entry.qty += item.qty;
      entry.revenue += item.qty * item.price;
      itemTotals.set(item.itemId, entry);
    })
  );
  const top = [...itemTotals.entries()]
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
    .map(([id, entry]) => ({ item: menu.find((dish) => dish.id === id), ...entry }))
    .filter((entry) => entry.item);

  const recent = [...orders]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 6);
  const featured = menu.find((item) => item.id === featuredId);
  const studentCount = users.filter((user) => user.role === "student").length;
  const reviews = ctx.state.reviews || [];
  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  return `
    <div class="page-head row-between wrap">
      <div>
        <h1 class="page-title">Canteen overview</h1>
        <p class="page-sub">${formatDateLong(today)} · ${studentCount} student accounts · ${menu.length} dishes on the menu.</p>
      </div>
      <div class="row wrap">
        <a class="btn btn-outline btn-sm" href="#/admin/reviews">Reviews</a>
        <a class="btn btn-outline btn-sm" href="#/admin/orders">All orders</a>
        <a class="btn btn-primary btn-sm" href="#/admin/menu">Manage menu</a>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Average rating</span><span class="stat-icon">${svg.star}</span></div>
        <div class="stat-value">${avgRating ? avgRating.toFixed(1) : "—"}</div>
        <div class="stat-hint">${reviews.length} student review${reviews.length === 1 ? "" : "s"} · <a class="link-green" href="#/admin/reviews">see all</a></div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Bookings today</span><span class="stat-icon">${svg.list}</span></div>
        <div class="stat-value">${active.length}</div>
        <div class="stat-hint">${plates} plates pre-booked</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Revenue today</span><span class="stat-icon">${svg.rupee}</span></div>
        <div class="stat-value">${inr(revenue)}</div>
        <div class="stat-hint">Pay at the counter</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Ready for pickup</span><span class="stat-icon">${svg.check}</span></div>
        <div class="stat-value">${todays.filter((order) => order.status === "Ready").length}</div>
        <div class="stat-hint">Waiting at the counter</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Cancelled today</span><span class="stat-icon">${svg.x}</span></div>
        <div class="stat-value">${cancelled}</div>
        <div class="stat-hint">${todays.length ? Math.round((cancelled / todays.length) * 100) : 0}% of bookings</div>
      </div>
    </div>

    <div class="panel-grid">
      <section class="card">
        <div class="card-head">
          <h2 class="card-title">Slot load today</h2>
          <span class="badge badge-neutral">${active.length} bookings</span>
        </div>
        <div class="card-body bar-list">
          ${slotCounts
            .map(
              (entry) => `<div class="bar-item">
                <div class="bar-top"><span>${escapeHtml(entry.slot)}</span><b>${entry.count}</b></div>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.round(
                  (entry.count / busiest) * 100
                )}%"></div></div>
              </div>`
            )
            .join("")}
        </div>
      </section>

      <div class="stack">
        <section class="card">
          <div class="card-head">
            <h2 class="card-title">Top selling today</h2>
            <a class="link-green tiny" href="#/admin/menu">Menu →</a>
          </div>
          <div class="card-body">
            ${
              top.length
                ? `<div class="top-list">
                    ${top
                      .map(
                        (entry, index) => `<div class="top-item">
                          <span class="top-rank">${index + 1}</span>
                          <img class="top-thumb" src="${escapeHtml(entry.item.image)}" alt="" />
                          <div>
                            <div class="top-name">${escapeHtml(entry.item.name)}</div>
                            <div class="top-meta">${entry.qty} sold · ${inr(entry.item.price)} each</div>
                          </div>
                          <span class="top-amount">${inr(entry.revenue)}</span>
                        </div>`
                      )
                      .join("")}
                  </div>`
                : `<p class="small muted">No orders yet today. Top sellers will appear here.</p>`
            }
          </div>
        </section>

        ${
          featured
            ? `<section class="card">
                 <div class="card-head"><h2 class="card-title">Today's pick</h2><a class="link-green tiny" href="#/admin/menu">Change</a></div>
                 <div class="card-body row" style="gap:14px;flex-wrap:wrap">
                   <img class="menu-thumb" src="${escapeHtml(featured.image)}" alt="" style="width:72px;height:56px" />
                   <div>
                     <div class="top-name">${escapeHtml(featured.name)}</div>
                     <div class="top-meta">${escapeHtml(featured.category)} · ${inr(featured.price)}</div>
                     <div class="row" style="gap:6px;margin-top:4px">${stars(
                       ratingSummary(reviews, featured.id).avg
                     )}<span class="tiny muted">${ratingSummary(reviews, featured.id).count} reviews</span></div>
                   </div>
                 </div>
               </section>`
            : ""
        }
      </div>
    </div>

    <section>
      <div class="section-head">
        <div>
          <h2 class="section-title">Recent bookings</h2>
          <p class="section-sub">The latest pre-orders across every counter.</p>
        </div>
        <a class="link-green small" href="#/admin/orders">View all →</a>
      </div>
      <div class="table-card">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr><th>Order</th><th>Student</th><th>Date</th><th>Slot</th><th class="num">Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${recent
                .map(
                  (order) => `<tr>
                    <td class="order-code">${escapeHtml(order.code)}</td>
                    <td>${escapeHtml(order.customerName)}${
                      order.rollNo ? `<div class="tiny muted">${escapeHtml(order.rollNo)}</div>` : ""
                    }</td>
                    <td class="nowrap">${formatDate(order.date)}</td>
                    <td class="nowrap">${escapeHtml(order.slot)}</td>
                    <td class="num strong">${inr(order.total)}</td>
                    <td>${statusBadge(order.status)}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        ${
          recent.length
            ? ""
            : `<div class="table-note">${svg.info}<span>No bookings yet. They will show up here as students order.</span></div>`
        }
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Menu management                                                     */
/* ------------------------------------------------------------------ */

function menuModal(item, categories, counters, lockedCanteen = "") {
  const isEdit = Boolean(item);
  const value = (key, fallback = "") => escapeHtml(item ? item[key] ?? fallback : fallback);
  const imageValue = item ? item.image : IMAGE_OPTIONS[0][0];

  return `<div class="modal-root open" data-action="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="menu-modal-title">
      <form data-form="menu-item" novalidate>
        <div class="modal-head">
          <h3 class="modal-title" id="menu-modal-title">${isEdit ? "Edit menu item" : "Add menu item"}</h3>
          <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">${svg.x}</button>
        </div>
        <div class="modal-body form-grid">
          <input type="hidden" name="id" value="${item ? escapeHtml(item.id) : ""}" />
          <div class="field full">
            <label class="label" for="mi-name">Item name</label>
            <input class="input" id="mi-name" name="name" required maxlength="60" value="${value("name")}"
              placeholder="e.g. Paneer Paratha" />
          </div>
          <div class="field">
            <label class="label" for="mi-price">Price (₹)</label>
            <input class="input" id="mi-price" name="price" type="number" min="1" max="5000" step="1" required
              value="${item ? item.price : 40}" />
          </div>
          <div class="field">
            <label class="label" for="mi-category">Category</label>
            <select class="select" id="mi-category" name="category">
              ${categories
                .map(
                  (category) =>
                    `<option ${item && item.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="field full">
            <span class="label">Sold at canteen</span>
            ${
              lockedCanteen
                ? `<div class="locked-date">${svg.coffee}<span><b>${escapeHtml(
                    lockedCanteen
                  )}</b> · your canteen</span></div>
                   <input type="hidden" name="canteen" value="${escapeHtml(lockedCanteen)}" />`
                : `<select class="select" id="mi-canteen" name="canteen">
                     ${counters
                       .map(
                         (canteen) =>
                           `<option value="${escapeHtml(canteen)}" ${
                             item && item.canteen === canteen ? "selected" : ""
                           }>${escapeHtml(canteen)}</option>`
                       )
                       .join("")}
                   </select>`
            }
          </div>
          <div class="field full">
            <label class="label" for="mi-image">Photo</label>
            <select class="select" id="mi-image" name="image">
              ${IMAGE_OPTIONS.map(
                ([source, label]) =>
                  `<option value="${source}" ${imageValue === source ? "selected" : ""}>${escapeHtml(label)}</option>`
              ).join("")}
            </select>
          </div>
          <div class="field full">
            <label class="label" for="mi-desc">Short description</label>
            <textarea class="textarea" id="mi-desc" name="description" rows="2" maxlength="160"
              placeholder="What is on the plate?">${value("description")}</textarea>
          </div>
          <label class="row small"><input type="checkbox" name="veg" ${!item || item.veg ? "checked" : ""} /> Vegetarian</label>
          <label class="row small"><input type="checkbox" name="available" ${
            !item || item.available ? "checked" : ""
          } /> Available today</label>
          <div class="full" id="menu-error"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save changes" : "Add item"}</button>
        </div>
      </form>
    </div>
  </div>`;
}

export function renderAdminMenu(ctx) {
  const { menu, featuredId, ui, categories, counters, user } = ctx.state;
  const staff = user.role === "staff";
  const myCanteen = staff ? user.canteen || "" : "";
  const query = (ui.adminMenuQuery || "").trim().toLowerCase();
  const list = (staff ? menu.filter((item) => item.canteen === myCanteen) : menu).filter(
    (item) =>
      !query ||
      [item.name, item.category, item.canteen || "", item.description]
        .join(" ")
        .toLowerCase()
        .includes(query)
  );
  const editing =
    ui.modal && ui.modal.type === "menu"
      ? ui.modal.itemId
        ? menu.find((item) => item.id === ui.modal.itemId) || null
        : null
      : null;
  const featured = list.find((item) => item.id === featuredId);

  return `
    <div class="page-head row-between wrap">
      <div>
        <h1 class="page-title">${staff ? `${escapeHtml(myCanteen || "Canteen")} menu` : "Menu management"}</h1>
        <p class="page-sub">${
          staff
            ? "Add dishes for your canteen, update prices and mark items sold out."
            : "Add dishes to a canteen's menu, change prices, mark items sold out and choose today's pick."
        }</p>
      </div>
      <div class="row wrap" style="gap:10px">
        <div class="search-box">
          ${svg.search}
          <input class="input" id="admin-menu-search" type="search" placeholder="Search this menu"
            value="${escapeHtml(ui.adminMenuQuery || "")}" data-input="adminMenuQuery" aria-label="Search the menu" />
        </div>
        <button class="btn btn-primary" data-action="open-add-item">${svg.plus} Add item</button>
      </div>
    </div>

    <div class="card">
      <div class="card-body row-between wrap">
        <div class="row" style="gap:12px">
          ${
            featured
              ? `<img class="menu-thumb" src="${escapeHtml(featured.image)}" alt="" />
                 <div>
                   <div class="tiny muted">Today's pick</div>
                   <div class="top-name">${escapeHtml(featured.name)} · ${inr(featured.price)}</div>
                 </div>`
              : `<div class="small muted">${
                  staff ? "No dishes in your canteen yet — add the first one." : "No today's pick selected yet."
                }</div>`
          }
        </div>
        <span class="tiny muted">${list.length} dishes · ${
          list.filter((item) => item.available).length
        } available</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-scroll">
        <table class="data-table admin-menu-table">
          <thead>
            <tr>
              <th>Item</th><th>Category</th><th>Canteen</th><th class="num">Price</th>
              <th>Availability</th>${staff ? "" : "<th>Today's pick</th>"}<th class="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (item) => `<tr>
                  <td>
                    <div class="row" style="gap:11px">
                      <img class="menu-thumb" src="${escapeHtml(item.image)}" alt="" loading="lazy" />
                      <div>
                        <div class="strong">${escapeHtml(item.name)}</div>
                        <div class="tiny muted" style="max-width:280px">${escapeHtml(item.description)}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-neutral">${escapeHtml(item.category)}</span></td>
                  <td><span class="canteen-tag">${escapeHtml(item.canteen || "—")}</span></td>
                  <td class="num strong">${inr(item.price)}</td>
                  <td>
                    <label class="switch">
                      <input type="checkbox" data-change="availability" data-id="${item.id}" ${
                        item.available ? "checked" : ""
                      } />
                      <span class="switch-track"></span>
                      <span class="switch-label">${item.available ? "In stock" : "Sold out"}</span>
                    </label>
                  </td>
                  ${
                    staff
                      ? ""
                      : `<td>
                           <button class="star-btn ${item.id === featuredId ? "on" : ""}" data-action="set-featured"
                             data-id="${item.id}" data-name="${escapeHtml(item.name)}" ${
                               item.available ? "" : "disabled"
                             }
                             title="${item.id === featuredId ? "Today's pick" : "Make today's pick"}"
                             aria-label="Make ${escapeHtml(item.name)} today's pick">${svg.star}</button>
                         </td>`
                  }
                  <td class="num">
                    <div class="row" style="justify-content:flex-end;gap:7px">
                      <button class="btn btn-outline btn-xs" data-action="edit-item" data-id="${item.id}">Edit</button>
                      ${
                        staff
                          ? ""
                          : `<button class="icon-btn" data-action="delete-item" data-id="${item.id}"
                               data-name="${escapeHtml(item.name)}" aria-label="Delete ${escapeHtml(
                                 item.name
                               )}">${svg.trash}</button>`
                      }
                    </div>
                  </td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${
        list.length
          ? ""
          : `<div class="table-note">${svg.info}<span>${
              query
                ? `No dishes match “${escapeHtml(ui.adminMenuQuery.trim())}”.`
                : "No dishes yet. Use “Add item” to build the menu."
            }</span></div>`
      }
    </div>

    ${
      ui.modal && ui.modal.type === "menu"
        ? menuModal(editing, categories, counters, staff ? myCanteen : "")
        : ""
    }`;
}

/* ------------------------------------------------------------------ */
/* All orders                                                          */
/* ------------------------------------------------------------------ */

export function renderAdminOrders(ctx) {
  const { orders, ui, statuses, today } = ctx.state;
  const query = ui.adminOrderQuery.trim().toLowerCase();
  const statusFilter = ui.adminOrderStatus;
  const dateFilter = ui.adminOrderDate;

  const list = [...orders]
    .filter((order) => (statusFilter === "All" ? true : order.status === statusFilter))
    .filter((order) => {
      if (dateFilter === "today") return order.date === today;
      if (dateFilter === "upcoming") return order.date > today;
      if (dateFilter === "past") return order.date < today;
      return true;
    })
    .filter((order) => {
      if (!query) return true;
      return (
        order.code.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        (order.rollNo || "").toLowerCase().includes(query) ||
        order.counter.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return `
    <div class="page-head row-between wrap">
      <div>
        <h1 class="page-title">All orders</h1>
        <p class="page-sub">Every pre-booking across the canteen. Change a status if a student needs help.</p>
      </div>
      <span class="badge badge-neutral">${list.length} of ${orders.length} orders</span>
    </div>

    <div class="admin-toolbar">
      <div class="search-box">
        ${svg.search}
        <input class="input" id="admin-order-search" type="search" placeholder="Search code, student or counter"
          value="${escapeHtml(ui.adminOrderQuery)}" data-input="adminOrderQuery" aria-label="Search orders" />
      </div>
      <select class="select select-sm" data-change="adminOrderStatus" aria-label="Filter by status">
        ${["All", ...statuses]
          .map((status) => `<option ${statusFilter === status ? "selected" : ""}>${status}</option>`)
          .join("")}
      </select>
      <select class="select select-sm" data-change="adminOrderDate" aria-label="Filter by date">
        <option value="all" ${dateFilter === "all" ? "selected" : ""}>All dates</option>
        <option value="today" ${dateFilter === "today" ? "selected" : ""}>Today</option>
        <option value="upcoming" ${dateFilter === "upcoming" ? "selected" : ""}>Upcoming</option>
        <option value="past" ${dateFilter === "past" ? "selected" : ""}>Past</option>
      </select>
    </div>

    ${
      list.length
        ? `<div class="table-card">
             <div class="table-scroll">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Order</th><th>Student</th><th>Date</th><th>Slot</th><th>Items</th>
                     <th class="num">Amount</th><th>Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${list
                     .map(
                       (order) => `<tr>
                         <td class="order-code">${escapeHtml(order.code)}
                           <div class="tiny muted">${escapeHtml(order.counter)}</div>
                         </td>
                         <td>${escapeHtml(order.customerName)}${
                           order.rollNo ? `<div class="tiny muted">${escapeHtml(order.rollNo)}</div>` : ""
                         }</td>
                         <td class="nowrap">${formatDate(order.date)}</td>
                         <td class="nowrap">${escapeHtml(order.slot)}</td>
                         <td class="order-items">${escapeHtml(itemsSummary(order.items))}</td>
                         <td class="num strong">${inr(order.total)}</td>
                         <td>
                           <select class="select select-sm" data-change="order-status" data-id="${order.id}"
                             data-code="${escapeHtml(order.code)}" aria-label="Status for ${escapeHtml(order.code)}">
                             ${statuses
                               .map(
                                 (status) =>
                                   `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`
                               )
                               .join("")}
                           </select>
                         </td>
                       </tr>`
                     )
                     .join("")}
                 </tbody>
               </table>
             </div>
             <div class="table-note">${svg.info}<span>Students can cancel up to 1 hour before their slot. Staff and admins can cancel at any point before collection.</span></div>
           </div>`
        : `<div class="card">${emptyState(
            "No orders match",
            "Try a different search term, status or date range.",
            `<button class="btn btn-outline btn-sm" data-action="reset-order-filters">Reset filters</button>`
          )}</div>`
    }`;
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export function renderAdminReviews(ctx) {
  const { reviews, menu } = ctx.state;
  const avg = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;
  const fiveStar = reviews.filter((review) => review.rating === 5).length;
  const lowStar = reviews.filter((review) => review.rating <= 2).length;
  const withComments = reviews.filter((review) => review.comment).length;
  const sorted = [...reviews].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return `
    <div class="page-head row-between wrap">
      <div>
        <h1 class="page-title">Reviews & feedback</h1>
        <p class="page-sub">Ratings students left after collecting their meals. These appear on the public menu.</p>
      </div>
      <span class="badge badge-neutral">${reviews.length} review${reviews.length === 1 ? "" : "s"}</span>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Average rating</span><span class="stat-icon">${svg.star}</span></div>
        <div class="stat-value">${avg ? avg.toFixed(1) : "—"}</div>
        <div class="stat-hint">${stars(avg)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">5-star reviews</span><span class="stat-icon">${svg.check}</span></div>
        <div class="stat-value">${fiveStar}</div>
        <div class="stat-hint">${reviews.length ? Math.round((fiveStar / reviews.length) * 100) : 0}% of all reviews</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Needs attention</span><span class="stat-icon">${svg.info}</span></div>
        <div class="stat-value">${lowStar}</div>
        <div class="stat-hint">Rated 2 stars or lower</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Written comments</span><span class="stat-icon">${svg.list}</span></div>
        <div class="stat-value">${withComments}</div>
        <div class="stat-hint">Out of ${reviews.length} reviews</div>
      </div>
    </div>

    ${
      sorted.length
        ? `<div class="table-card">
             <div class="table-scroll">
               <table class="data-table admin-review-table">
                 <thead>
                   <tr>
                     <th>Dish</th><th>Student</th><th>Rating</th><th>Comment</th>
                     <th>Order</th><th>Left</th><th class="num">Remove</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${sorted
                     .map((review) => {
                       const dish = menu.find((item) => item.id === review.itemId);
                       return `<tr>
                         <td>
                           <div class="row" style="gap:10px">
                             ${
                               dish
                                 ? `<img class="menu-thumb" src="${escapeHtml(dish.image)}" alt="" loading="lazy" />`
                                 : ""
                             }
                             <div>
                               <div class="strong">${escapeHtml(review.itemName)}</div>
                               <div class="tiny muted">${escapeHtml(dish ? dish.category : "Removed from menu")}</div>
                             </div>
                           </div>
                         </td>
                         <td>${escapeHtml(review.userName)}</td>
                         <td><div class="row" style="gap:7px">${stars(review.rating)}<b>${review.rating}</b></div></td>
                         <td class="review-cell">${
                           review.comment
                             ? escapeHtml(review.comment)
                             : `<span class="tiny muted">No comment</span>`
                         }</td>
                         <td class="order-code">${escapeHtml(review.orderCode)}</td>
                         <td class="nowrap tiny muted">${formatWhen(review.createdAt)}</td>
                         <td class="num">
                           <button class="icon-btn" data-action="delete-review" data-id="${review.id}"
                             aria-label="Remove review of ${escapeHtml(review.itemName)}">${svg.trash}</button>
                         </td>
                       </tr>`;
                     })
                     .join("")}
                 </tbody>
               </table>
             </div>
             <div class="table-note">${svg.info}<span>Only students can leave reviews, and only for dishes on their collected orders. Removing a review deletes it from the menu for everyone.</span></div>
           </div>`
        : `<div class="card">${emptyState(
            "No reviews yet",
            "Students can rate a dish after their order is marked collected. Ratings will show up here."
          )}</div>`
    }`;
}

/* ------------------------------------------------------------------ */
/* Pickup counters                                                     */
/* ------------------------------------------------------------------ */

export function renderAdminCounters(ctx) {
  const { counters, orders, today, menu } = ctx.state;
  const todays = orders.filter((order) => order.date === today && order.status !== "Cancelled");

  return `
    <div class="page-head row-between wrap">
      <div>
        <h1 class="page-title">Canteens & counters</h1>
        <p class="page-sub">Each canteen has its own menu. Add a canteen, or take one out of service once its dishes are moved.</p>
      </div>
      <span class="badge badge-neutral">${counters.length} active counter${counters.length === 1 ? "" : "s"}</span>
    </div>

    <form class="card" data-form="counter" novalidate>
      <div class="card-body row-between wrap" style="gap:14px">
        <div class="field" style="flex:1;min-width:220px">
          <label class="label" for="counter-name">Add a pickup counter</label>
          <input class="input" id="counter-name" name="counterName" maxlength="40"
            placeholder="e.g. Science Block Counter" />
        </div>
        <button class="btn btn-primary" type="submit">${svg.plus} Add counter</button>
      </div>
      <div style="padding:0 22px 18px" id="counter-error"></div>
    </form>

    <div class="counter-grid">
      ${counters
        .map((counter) => {
          const todaysOrders = todays.filter((order) => order.counter === counter);
          const plates = todaysOrders.reduce((sum, order) => sum + totalQty(order.items), 0);
          const revenue = todaysOrders.reduce((sum, order) => sum + order.total, 0);
          const dishes = menu.filter((item) => item.canteen === counter).length;
          const busy = todaysOrders.length > 0;
          const locked = busy || dishes > 0 || counters.length <= 1;
          return `<article class="counter-card">
            <div class="counter-top">
              <div>
                <h3>${escapeHtml(counter)}</h3>
                <p class="tiny muted">${dishes} dish${dishes === 1 ? "" : "es"} on the menu</p>
              </div>
              <div class="counter-badges">
                <span class="badge badge-neutral">${dishes} dishes</span>
                <span class="badge ${busy ? "badge-ready" : "badge-neutral"}">${todaysOrders.length} today</span>
              </div>
            </div>
            <div class="counter-stats">
              <div><b>${plates}</b><span>plates booked</span></div>
              <div><b>${inr(revenue)}</b><span>value today</span></div>
            </div>
            <div class="counter-foot">
              <span class="tiny muted">${
                dishes > 0
                  ? "Move its dishes to another canteen before removing"
                  : busy
                  ? "In use — cancel or move today's bookings first"
                  : counters.length <= 1
                  ? "At least one counter is required"
                  : "No dishes and no bookings today"
              }</span>
              <button class="btn btn-danger btn-xs" data-action="remove-counter" data-name="${escapeHtml(
                counter
              )}" ${locked ? "disabled" : ""}>Remove</button>
            </div>
          </article>`;
        })
        .join("")}
    </div>

    <div class="table-card">
      <div class="table-note">${svg.info}<span>Each canteen sells its own dishes, and students collect each canteen's order at that canteen. A canteen can only be removed when it has no dishes and no bookings today.</span></div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export function renderAdminUsers(ctx) {
  const { users, orders, ui, counters } = ctx.state;
  const currentId = ctx.user.id;
  const editing = ui.modal && ui.modal.type === "user"
    ? ui.modal.userId
      ? users.find((user) => user.id === ui.modal.userId) || null
      : null
    : undefined;
  const activity = new Map();
  orders.forEach((order) => {
    const entry = activity.get(order.userId) || { bookings: 0, spent: 0 };
    entry.bookings += 1;
    if (order.status !== "Cancelled") {
      entry.spent += order.total;
    }
    activity.set(order.userId, entry);
  });

  const order = { student: 0, staff: 1, admin: 2 };
  const list = [...users].sort(
    (a, b) => (order[a.role] ?? 3) - (order[b.role] ?? 3) || a.name.localeCompare(b.name)
  );

  return `
    <div class="page-head row-between wrap">
      <div>
        <h1 class="page-title">Canteen accounts</h1>
        <p class="page-sub">Students, counter staff and administrators. Revoke an account to sign it out and block access.</p>
      </div>
      <div class="row wrap" style="gap:10px">
        <span class="badge badge-neutral">${users.length} accounts · ${
          users.filter((user) => !user.active).length
        } revoked</span>
        <button class="btn btn-primary btn-sm" data-action="open-add-user">${svg.plus} Add account</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Total accounts</span><span class="stat-icon">${svg.users}</span></div>
        <div class="stat-value">${users.length}</div>
        <div class="stat-hint">Across all three roles</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Students</span><span class="stat-icon">${svg.user}</span></div>
        <div class="stat-value">${users.filter((user) => user.role === "student").length}</div>
        <div class="stat-hint">Can pre-book meals</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Canteen staff</span><span class="stat-icon">${svg.coffee}</span></div>
        <div class="stat-value">${users.filter((user) => user.role === "staff").length}</div>
        <div class="stat-hint">Run the counter queue</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span class="stat-label">Admins</span><span class="stat-icon">${svg.grid}</span></div>
        <div class="stat-value">${users.filter((user) => user.role === "admin").length}</div>
        <div class="stat-hint">Manage menu and orders</div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>ID</th><th class="num">Bookings</th><th class="num">Spent</th><th class="num">Actions</th></tr>
          </thead>
          <tbody>
            ${list
              .map((user) => {
                const stats = activity.get(user.id) || { bookings: 0, spent: 0 };
                const self = user.id === currentId;
                return `<tr class="${user.active ? "" : "is-revoked"}">
                  <td>
                    <div class="row" style="gap:10px">
                      <span class="avatar">${initials(user.name)}</span>
                      <div>
                        <span class="strong">${escapeHtml(user.name)}</span>
                        ${self ? `<div class="tiny muted">You</div>` : ""}
                      </div>
                    </div>
                  </td>
                  <td class="muted">${escapeHtml(user.email)}</td>
                  <td>${roleBadge(user.role)}${
                    user.role === "staff" && user.canteen
                      ? `<div class="tiny muted" style="margin-top:2px">${escapeHtml(user.canteen)}</div>`
                      : ""
                  }</td>
                  <td>${
                    user.active
                      ? `<span class="badge badge-completed">Active</span>`
                      : `<span class="badge badge-cancelled">Revoked</span>`
                  }</td>
                  <td class="nowrap">${escapeHtml(user.rollNo || "—")}</td>
                  <td class="num">${stats.bookings}</td>
                  <td class="num strong">${inr(stats.spent)}</td>
                  <td class="num">
                    <div class="row" style="justify-content:flex-end;gap:7px">
                      <button class="btn btn-outline btn-xs" data-action="open-edit-user" data-id="${user.id}">Edit</button>
                      ${
                        self
                          ? ""
                          : `<button class="btn btn-outline btn-xs" data-action="${
                              user.active ? "revoke-user" : "activate-user"
                            }" data-id="${user.id}" data-name="${escapeHtml(user.name)}">${
                              user.active ? "Revoke" : "Restore"
                            }</button>
                             <button class="icon-btn" data-action="delete-user" data-id="${user.id}"
                               data-name="${escapeHtml(user.name)}" aria-label="Delete ${escapeHtml(
                                 user.name
                               )}" title="Delete account">${svg.trash}</button>`
                      }
                    </div>
                  </td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    ${
      ui.modal && ui.modal.type === "user"
        ? userModal(editing === undefined ? null : editing, counters)
        : ""
    }`;
}

function userModal(user, counters) {
  const isEdit = Boolean(user);
  const value = (key, fallback = "") => escapeHtml(user ? user[key] ?? fallback : fallback);

  return `<div class="modal-root open" data-action="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
      <form data-form="new-user" novalidate>
        <div class="modal-head">
          <div>
            <h3 class="modal-title" id="user-modal-title">${isEdit ? "Edit account" : "Add an account"}</h3>
            <p class="tiny muted">${
              isEdit
                ? "Only admins can change names, emails, IDs and account types."
                : "The person can sign in right away with this email and password."
            }</p>
          </div>
          <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">${svg.x}</button>
        </div>
        <div class="modal-body form-grid">
          <input type="hidden" name="id" value="${user ? escapeHtml(user.id) : ""}" />
          <div class="field">
            <label class="label" for="nu-name">Full name</label>
            <input class="input" id="nu-name" name="name" required maxlength="60" value="${value(
              "name"
            )}" placeholder="e.g. Nisha Rao" />
          </div>
          <div class="field">
            <label class="label" for="nu-role">Account type</label>
            <select class="select" id="nu-role" name="role">
              <option value="student" ${user && user.role === "student" ? "selected" : ""}>Student</option>
              <option value="staff" ${user && user.role === "staff" ? "selected" : ""}>Canteen staff</option>
              <option value="admin" ${user && user.role === "admin" ? "selected" : ""}>Admin</option>
            </select>
          </div>
          <div class="field">
            <label class="label" for="nu-email">College email</label>
            <input class="input" id="nu-email" name="email" type="email" required value="${value(
              "email"
            )}" placeholder="name@campus.edu" autocomplete="off" />
          </div>
          <div class="field">
            <label class="label" for="nu-password">${
              isEdit ? "New password (optional)" : "Password"
            }</label>
            <input class="input" id="nu-password" name="password" type="text" ${
              isEdit ? "" : "required"
            } minlength="6" maxlength="72"
              placeholder="${isEdit ? "Leave blank to keep the current one" : "At least 6 characters"}"
              autocomplete="off" />
          </div>
          <div class="field">
            <label class="label" for="nu-roll">Roll no / Staff ID</label>
            <input class="input" id="nu-roll" name="rollNo" maxlength="24" value="${value(
              "rollNo"
            )}" placeholder="CSE21099" />
          </div>
          <div class="field">
            <label class="label" for="nu-dept">Department</label>
            <input class="input" id="nu-dept" name="department" maxlength="60" value="${value(
              "department"
            )}" placeholder="Computer Science" />
          </div>
          <div class="field">
            <label class="label" for="nu-phone">Phone (optional)</label>
            <input class="input" id="nu-phone" name="phone" maxlength="24" value="${value(
              "phone"
            )}" placeholder="+91 98765 43210" />
          </div>
          <div class="field">
            <label class="label" for="nu-canteen">Canteen (staff accounts)</label>
            <select class="select" id="nu-canteen" name="canteen">
              <option value="" ${!user || !user.canteen ? "selected" : ""}>Not assigned</option>
              ${counters
                .map(
                  (canteen) =>
                    `<option value="${escapeHtml(canteen)}" ${
                      user && user.canteen === canteen ? "selected" : ""
                    }>${escapeHtml(canteen)}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="full" id="user-error"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? "Save changes" : "Create account"}</button>
        </div>
      </form>
    </div>
  </div>`;
}
