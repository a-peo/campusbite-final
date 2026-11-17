import { escapeHtml, formatDateLong, inr, statusBadge, svg, totalQty, emptyState } from "../ui.js";

const NEXT_ACTION = {
  Confirmed: { label: "Accept order", status: "Preparing" },
  Preparing: { label: "Mark ready", status: "Ready" },
  Ready: { label: "Mark collected", status: "Completed" },
};

function queueCard(order) {
  const action = NEXT_ACTION[order.status];
  const isReady = order.status === "Ready";

  return `<article class="queue-card ${isReady ? "is-ready" : ""}">
    <div class="queue-head">
      <div>
        <div class="queue-code">${escapeHtml(order.code)}</div>
        <div class="queue-customer">${escapeHtml(order.customerName)}${
          order.rollNo ? ` · ${escapeHtml(order.rollNo)}` : ""
        }</div>
      </div>
      ${statusBadge(order.status)}
    </div>
    <div class="queue-body">
      <div class="row wrap" style="gap:6px">
        <span class="queue-time">${svg.clock} ${escapeHtml(order.slot)}</span>
        <span class="queue-time">${escapeHtml(order.counter)}</span>
      </div>
      <ul class="queue-items" style="margin-top:10px">
        ${order.items
          .map(
            (item) =>
              `<li><span>${escapeHtml(item.name)}</span><span class="q">×${item.qty}</span></li>`
          )
          .join("")}
      </ul>
      <p class="tiny muted" style="margin-top:8px">${totalQty(order.items)} plates · booked for ${formatDateLong(
        order.date
      )}</p>
    </div>
    <div class="queue-foot">
      <span class="queue-total">Total <b>${inr(order.total)}</b></span>
      <div class="queue-actions">
        ${
          action
            ? `<button class="btn btn-primary btn-xs" data-action="order-status" data-id="${order.id}"
                data-status="${action.status}" data-code="${escapeHtml(order.code)}">${action.label}</button>`
            : ""
        }
        ${
          ["Confirmed", "Preparing"].includes(order.status)
            ? `<button class="btn btn-danger btn-xs" data-action="cancel-order" data-id="${order.id}"
                data-code="${escapeHtml(order.code)}">Cancel</button>`
            : ""
        }
      </div>
    </div>
  </article>`;
}

export function renderQueue(ctx) {
  const { orders, today, ui, slots } = ctx.state;
  const todays = orders.filter((order) => order.date === today);
  const counts = { Confirmed: 0, Preparing: 0, Ready: 0, Completed: 0, Cancelled: 0 };
  todays.forEach((order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
  });

  const query = ui.queueQuery.trim().toLowerCase();
  const list = todays
    .filter((order) => (ui.queueFilter === "All" ? true : order.status === ui.queueFilter))
    .filter((order) => {
      if (!query) return true;
      return (
        order.code.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        (order.rollNo || "").toLowerCase().includes(query) ||
        order.slot.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot) || a.code.localeCompare(b.code, undefined, { numeric: true }));

  const stats = [
    { label: "Awaiting acceptance", value: counts.Confirmed, hint: "Confirmed bookings", icon: svg.list },
    { label: "In the kitchen", value: counts.Preparing, hint: "Being prepared", icon: svg.coffee },
    { label: "Ready for pickup", value: counts.Ready, hint: "Call the student", icon: svg.check },
    { label: "Collected today", value: counts.Completed, hint: "Handed over", icon: svg.bag },
  ];

  return `
    <div class="page-head row-between wrap">
      <div>
        <h1 class="page-title">Today's Queue</h1>
        <p class="page-sub">${formatDateLong(today)} · advance orders as you pack them.</p>
      </div>
      <button class="btn btn-outline btn-sm" data-action="refresh">${svg.clock} Refresh</button>
    </div>

    <div class="stat-grid">
      ${stats
        .map(
          (stat) => `<div class="stat-card">
            <div class="stat-top"><span class="stat-label">${stat.label}</span><span class="stat-icon">${stat.icon}</span></div>
            <div class="stat-value">${stat.value}</div>
            <div class="stat-hint">${stat.hint}</div>
          </div>`
        )
        .join("")}
    </div>

    <div class="row-between wrap">
      <div class="pill-row">
        ${["All", "Confirmed", "Preparing", "Ready", "Completed", "Cancelled"]
          .map(
            (status) => `<button class="pill ${ui.queueFilter === status ? "active" : ""}"
              data-action="filter-queue" data-status="${status}">
              ${status}<span class="count">${status === "All" ? todays.length : counts[status] || 0}</span>
            </button>`
          )
          .join("")}
      </div>
      <div class="search-box">
        ${svg.search}
        <input class="input" id="queue-search" type="search" placeholder="Search code, name or slot"
          value="${escapeHtml(ui.queueQuery)}" data-input="queueQuery" aria-label="Search today's orders" />
      </div>
    </div>

    ${
      list.length
        ? `<div class="queue-grid">${list.map(queueCard).join("")}</div>`
        : `<div class="card">${emptyState(
            "Nothing in this view",
            "No orders match this filter right now. Try another status or clear the search."
          )}</div>`
    }`;
}
