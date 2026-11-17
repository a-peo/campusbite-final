import { escapeHtml, inr, initials, roleBadge, ROLE_LABEL, svg, totalQty } from "../ui.js";

export function renderProfile(ctx) {
  const { user, state } = ctx;
  const isStudent = user.role === "student";
  const myOrders = isStudent ? state.orders.filter((order) => order.userId === user.id) : state.orders;
  const valid = myOrders.filter((order) => order.status !== "Cancelled");
  const active = myOrders.filter((order) => ["Confirmed", "Preparing", "Ready"].includes(order.status));
  const meals = valid.reduce((sum, order) => sum + totalQty(order.items), 0);
  const spent = valid.reduce((sum, order) => sum + order.total, 0);

  const itemCounts = new Map();
  valid.forEach((order) =>
    order.items.forEach((item) => itemCounts.set(item.name, (itemCounts.get(item.name) || 0) + item.qty))
  );
  const favourite = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const stats = isStudent
    ? [
        ["Bookings", myOrders.length],
        ["Meals booked", meals],
        ["Total spent", inr(spent)],
        ["Favourite", favourite ? favourite[0] : "—"],
      ]
    : [
        ["Orders today", myOrders.filter((order) => order.date === state.today).length],
        ["In queue", active.length],
        ["Served", myOrders.filter((order) => order.status === "Completed").length],
        ["Plates served", meals],
      ];

  const access =
    user.role === "staff"
      ? "You can advance confirmed orders to Preparing, Ready and Collected, cancel a booking at the counter, and mark dishes sold out from the Menu page."
      : user.role === "admin"
      ? "You can manage the menu, prices and today's pick, add or remove canteen counters, moderate student reviews, change order statuses, and revoke or delete accounts."
      : "Book today's meals, track your orders, rate collected dishes and cancel up to 1 hour before your pickup slot. Your name, email and roll number are managed by the canteen admin — you can update your phone number and password here.";

  return `
    <div class="page-head">
      <h1 class="page-title">Profile</h1>
      <p class="page-sub">Your ${ROLE_LABEL[user.role] || user.role} account for the campus canteen.</p>
    </div>

    <div class="profile-grid">
      <aside class="card profile-card">
        <span class="avatar lg">${initials(user.name)}</span>
        <div class="profile-name">${escapeHtml(user.name)}</div>
        <div class="profile-email">${escapeHtml(user.email)}</div>
        <div style="margin-top:10px">${roleBadge(user.role)}</div>

        <div class="profile-meta">
          <div><span class="k">${isStudent ? "Roll number" : "Staff ID"}</span><span class="v">${escapeHtml(
            user.rollNo || "—"
          )}</span></div>
          <div><span class="k">Department</span><span class="v">${escapeHtml(user.department || "—")}</span></div>
          <div><span class="k">Phone</span><span class="v">${escapeHtml(user.phone || "—")}</span></div>
        </div>

        <div class="mini-stats">
          ${stats
            .map(
              ([label, value]) =>
                `<div class="mini-stat"><b>${escapeHtml(String(value))}</b><span>${escapeHtml(label)}</span></div>`
            )
            .join("")}
        </div>
      </aside>

      <div class="stack">
        <form class="card" data-form="profile" novalidate>
          <div class="card-head">
            <h2 class="card-title">Account details</h2>
            <span class="badge badge-neutral">${ROLE_LABEL[user.role] || user.role}</span>
          </div>
          <div class="card-body form-grid">
            <div class="field">
              <label class="label" for="p-name">Full name</label>
              <input class="input" id="p-name" value="${escapeHtml(user.name)}" disabled />
            </div>
            <div class="field">
              <label class="label" for="p-email">College email</label>
              <input class="input" id="p-email" value="${escapeHtml(user.email)}" disabled />
            </div>
            <div class="field">
              <label class="label" for="p-roll">${isStudent ? "Roll number" : "Staff ID"}</label>
              <input class="input" id="p-roll" value="${escapeHtml(user.rollNo || "—")}" disabled />
            </div>
            <div class="field">
              <label class="label" for="p-dept">Department</label>
              <input class="input" id="p-dept" value="${escapeHtml(user.department || "—")}" disabled />
            </div>
            ${user.role === "staff" ? `<div class="field full">
              <label class="label" for="p-canteen">Canteen</label>
              <input class="input" id="p-canteen" value="${escapeHtml(user.canteen || "Not assigned")}" disabled />
            </div>` : ""}
            <div class="field full">
              <label class="label" for="p-phone">Phone</label>
              <input class="input" id="p-phone" name="phone" value="${escapeHtml(user.phone || "")}"
                placeholder="+91 98765 43210" />
            </div>
            <div class="full" id="profile-error"></div>
          </div>
          <div class="card-foot row-between wrap">
            <span class="tiny muted">Name, email, ID and account type are managed by the canteen admin.</span>
            <button class="btn btn-primary" type="submit">Save phone</button>
          </div>
        </form>

        <form class="card" data-form="password" novalidate>
          <div class="card-head">
            <h2 class="card-title">Change password</h2>
            <span class="stat-icon">${svg.info}</span>
          </div>
          <div class="card-body form-grid">
            <div class="field full">
              <label class="label" for="p-current">Current password</label>
              <input class="input" id="p-current" name="currentPassword" type="password" required
                autocomplete="current-password" placeholder="Your current password" />
            </div>
            <div class="field full">
              <label class="label" for="p-new">New password</label>
              <input class="input" id="p-new" name="newPassword" type="password" required
                minlength="6" maxlength="72" autocomplete="new-password" placeholder="At least 6 characters" />
            </div>
            <div class="full" id="password-error"></div>
          </div>
          <div class="card-foot row-between wrap">
            <span class="tiny muted">You stay signed in after changing it.</span>
            <button class="btn btn-primary" type="submit">Update password</button>
          </div>
        </form>

        <section class="card">
          <div class="card-head"><h2 class="card-title">Your access</h2><span class="stat-icon">${svg.info}</span></div>
          <div class="card-body">
            <p class="small muted">${escapeHtml(access)}</p>
            <div class="row wrap" style="margin-top:12px">
              ${
                user.role === "student"
                  ? `<a class="btn btn-outline btn-sm" href="#/menu">Browse menu</a>
                     <a class="btn btn-outline btn-sm" href="#/orders">My orders</a>`
                  : user.role === "staff"
                  ? `<a class="btn btn-outline btn-sm" href="#/queue">Today's queue</a>
                     <a class="btn btn-outline btn-sm" href="#/menu">Availability</a>`
                  : `<a class="btn btn-outline btn-sm" href="#/admin">Overview</a>
                     <a class="btn btn-outline btn-sm" href="#/admin/menu">Manage menu</a>
                     <a class="btn btn-outline btn-sm" href="#/admin/orders">All orders</a>`
              }
            </div>
          </div>
        </section>
      </div>
    </div>`;
}
