import { escapeHtml, svg } from "../ui.js";

const DEMO = {
  student: { email: "aarav@campus.edu", password: "demo1234", title: "Student" },
  staff: { email: "staff@campus.edu", password: "demo1234", title: "Staff" },
  admin: { email: "admin@campus.edu", password: "demo1234", title: "Admin" },
};

const ROLE_META = {
  student: { title: "Student", desc: "Order meals", icon: svg.user },
  staff: { title: "Staff", desc: "Serve orders", icon: svg.coffee },
  admin: { title: "Admin", desc: "Manage canteen", icon: svg.grid },
};

function roleOption(key, active) {
  const meta = ROLE_META[key];
  return `<button type="button" class="role-option ${key === active ? "active" : ""}"
      data-action="select-role" data-role="${key}" aria-pressed="${key === active}">
      ${meta.icon}
      <span class="role-name">${meta.title}</span>
      <span class="role-desc">${meta.desc}</span>
    </button>`;
}

export function renderLogin(ctx) {
  const role = ctx.state.ui.loginRole || "student";
  const demo = DEMO[role];

  return `<div class="login-wrap">
    <aside class="login-brand">
      <div class="brand">
        <span class="brand-mark">${svg.utensils}</span>
        <span class="brand-text">Canteen Pre-Booking System</span>
      </div>
      <div class="login-brand-inner">
        <h1>Skip the queue.<br />Eat on time.</h1>
        <p>Pre-book breakfast, lunch and snacks from the campus canteen, then collect them at your counter when they are ready.</p>
        <ul class="login-points">
          <li><span class="tick">${svg.check}</span><span>Today's pick and a live menu with availability</span></li>
          <li><span class="tick">${svg.check}</span><span>Choose your time slot and pickup counter</span></li>
          <li><span class="tick">${svg.check}</span><span>One place for students, counter staff and admins</span></li>
        </ul>
        <div class="login-food"><img src="food/thali.jpg" alt="A canteen thali with rice, curry and sides" /></div>
      </div>
      <p class="login-foot">Campus canteen demo · orders are stored on the canteen server</p>
    </aside>

    <main class="login-panel">
      <div class="login-card">
        <h2>Sign in</h2>
        <p>Pick an account type and the demo credentials are filled in for you.</p>

        <div class="role-picker" role="group" aria-label="Account type">
          ${roleOption("student", role)}
          ${roleOption("staff", role)}
          ${roleOption("admin", role)}
        </div>

        <form class="login-form" data-form="login" novalidate>
          <div class="field">
            <label class="label" for="email">College email</label>
            <input class="input" id="email" name="email" type="email" autocomplete="username"
              value="${escapeHtml(demo.email)}" required />
          </div>
          <div class="field">
            <label class="label" for="password">Password</label>
            <input class="input" id="password" name="password" type="password" autocomplete="current-password"
              value="${escapeHtml(demo.password)}" required />
          </div>
          <div id="login-error"></div>
          <button class="btn btn-primary btn-block" type="submit">Sign in as ${demo.title}</button>
        </form>

        <div class="demo-hint">
          <strong>Demo accounts</strong><br />
          Student <code>aarav@campus.edu</code> · Staff <code>staff@campus.edu</code> · Admin <code>admin@campus.edu</code><br />
          Password for all three: <code>demo1234</code>
        </div>
      </div>
    </main>
  </div>`;
}
