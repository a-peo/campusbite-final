// Browser-side backend: the canteen's server logic from the Java version,
// rewritten in plain JavaScript so the whole app runs with no server.
// Data lives in localStorage; a signed-in session is just a token -> user id map.

const DB_KEY = "canteen.db.v1";
const TOKENS_KEY = "canteen.tokens.v1";

export const TIME_SLOTS = [
  "08:30 AM - 09:00 AM",
  "11:30 AM - 12:00 PM",
  "12:30 PM - 01:00 PM",
  "01:00 PM - 01:30 PM",
  "03:30 PM - 04:00 PM",
  "05:00 PM - 05:30 PM",
  "07:00 PM - 07:30 PM",
];

const COUNTERS = ["Main Canteen", "North Block Counter", "Library Kiosk"];
const CATEGORIES = ["Breakfast", "Lunch", "Snacks", "Beverages"];
const STATUSES = ["Confirmed", "Preparing", "Ready", "Completed", "Cancelled"];
const DEFAULT_PASSWORD = "demo1234";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

const pad = (value) => String(value).padStart(2, "0");
const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const isoLocal = (date) =>
  `${isoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

function parseLocal(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso || "");
  if (!match) return new Date(iso);
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] || 0)
  );
}

/** Start of a booking slot, used for the "cancel up to 1 hour before" rule. */
export function slotStart(dateIso, slot) {
  const [year, month, day] = String(dateIso).split("-").map(Number);
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slot || "");
  if (!match) return new Date(year, (month || 1) - 1, day || 1);
  let hour = Number(match[1]) % 12;
  if (/pm/i.test(match[3])) hour += 12;
  return new Date(year, (month || 1) - 1, day || 1, hour, Number(match[2]), 0, 0);
}

const minutesAgo = (minutes) => isoLocal(new Date(Date.now() - minutes * 60000));

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function seedDb() {
  const db = {
    users: [],
    menu: [],
    orders: [],
    reviews: [],
    counters: [...COUNTERS],
    featuredId: "m-veg-biryani",
    nextOrderNo: 1015,
  };

  const user = (id, name, email, role, rollNo, department, phone, canteen = "") => ({
    id,
    name,
    email,
    password: DEFAULT_PASSWORD,
    role,
    rollNo,
    department,
    phone,
    canteen,
    active: true,
  });

  db.users.push(
    user("u-1", "Aarav Sharma", "aarav@campus.edu", "student", "CSE21042", "Computer Science", "+91 98765 43210"),
    user("u-2", "Diya Patel", "diya@campus.edu", "student", "ECE21018", "Electronics", "+91 98765 43211"),
    user("u-3", "Kabir Singh", "kabir@campus.edu", "student", "ME21077", "Mechanical", "+91 98765 43212"),
    user("u-4", "Meera Iyer", "meera@campus.edu", "student", "CSE21033", "Computer Science", "+91 98765 43213"),
    user("u-5", "Rohan Das", "rohan@campus.edu", "student", "CE21009", "Civil", "+91 98765 43214"),
    user("u-6", "Ananya Rao", "ananya@campus.edu", "student", "BT21051", "Biotechnology", "+91 98765 43215"),
    user("u-7", "Ishan Verma", "ishan@campus.edu", "student", "EE21026", "Electrical", "+91 98765 43216"),
    user("u-8", "Sneha Kulkarni", "sneha@campus.edu", "student", "CSE21064", "Computer Science", "+91 98765 43217"),
    user("u-staff", "Priya Nair", "staff@campus.edu", "staff", "CTN-014", "Canteen Operations", "+91 98765 43218", "Main Canteen"),
    user("u-staff-north", "Arjun Mehta", "staff.north@campus.edu", "staff", "CTN-021", "Canteen Operations", "+91 98765 43220", "North Block Counter"),
    user("u-staff-library", "Farah Khan", "staff.library@campus.edu", "staff", "CTN-032", "Canteen Operations", "+91 98765 43221", "Library Kiosk"),
    user("u-admin", "Rakesh Menon", "admin@campus.edu", "admin", "CTN-001", "Canteen Administration", "+91 98765 43219")
  );

  const item = (id, name, price, category, image, description, veg, available, canteen) => ({
    id,
    name,
    price,
    category,
    image,
    description,
    veg,
    available,
    canteen,
  });

  db.menu.push(
    item("m-idli", "Idli Sambar", 30, "Breakfast", "food/idli-sambar.jpg", "Steamed idlis with sambar and coconut chutney.", true, true, "North Block Counter"),
    item("m-paneer-paratha", "Paneer Paratha", 50, "Breakfast", "food/paneer-paratha.jpg", "Griddle-fried paratha stuffed with spiced paneer, served with curd.", true, true, "Main Canteen"),
    item("m-masala-dosa", "Masala Dosa", 40, "Breakfast", "food/masala-dosa.jpg", "Crisp dosa filled with potato masala, with sambar and chutney.", true, true, "North Block Counter"),
    item("m-vada-pav", "Vada Pav", 25, "Breakfast", "food/vada-pav.jpg", "Mumbai-style potato vada in a soft pav with chutney.", true, true, "North Block Counter"),
    item("m-upma", "Upma", 30, "Breakfast", "food/upma.jpg", "Semolina upma tempered with curry leaves and cashews.", true, true, "North Block Counter"),
    item("m-chole-bhature", "Chole Bhature", 55, "Breakfast", "food/chole-bhature.jpg", "Spicy chickpeas with two fluffy bhature.", true, false, "Main Canteen"),
    item("m-veg-fried-rice", "Veg Fried Rice", 60, "Lunch", "food/veg-fried-rice.jpg", "Wok-tossed rice with crunchy vegetables and spring onion.", true, true, "Main Canteen"),
    item("m-veg-biryani", "Veg Biryani", 70, "Lunch", "food/veg-biryani.jpg", "Fragrant basmati layered with vegetables and saffron.", true, true, "Main Canteen"),
    item("m-veg-pulao", "Veg Pulao", 65, "Lunch", "food/veg-pulao.jpg", "Mildly spiced rice pilaf with peas and carrots.", true, true, "Main Canteen"),
    item("m-curd-rice", "Curd Rice", 45, "Lunch", "food/curd-rice.jpg", "Cooling curd rice with mustard and pomegranate.", true, true, "Main Canteen"),
    item("m-pav-bhaji", "Pav Bhaji", 60, "Lunch", "food/pav-bhaji.jpg", "Buttery pav with a rich mashed vegetable bhaji.", true, true, "Main Canteen"),
    item("m-aloo-sandwich", "Aloo Sandwich", 35, "Snacks", "food/aloo-sandwich.jpg", "Grilled potato sandwich with chutney and cheese.", true, true, "North Block Counter"),
    item("m-samosa", "Samosa", 20, "Snacks", "food/samosa.jpg", "Crisp fried samosa with spiced potato filling.", true, true, "North Block Counter"),
    item("m-gulab-jamun", "Gulab Jamun", 30, "Snacks", "food/gulab-jamun.jpg", "Warm milk dumplings soaked in rose syrup.", true, true, "Main Canteen"),
    item("m-lemon-tea", "Lemon Tea", 15, "Beverages", "food/lemon-tea.jpg", "Freshly brewed tea with a squeeze of lemon.", true, true, "Library Kiosk"),
    item("m-filter-coffee", "Filter Coffee", 20, "Beverages", "food/filter-coffee.jpg", "Strong South Indian filter coffee with hot milk.", true, true, "Library Kiosk"),
    item("m-masala-chai", "Masala Chai", 15, "Beverages", "food/masala-chai.jpg", "Spiced milk tea with cardamom and ginger.", true, true, "Library Kiosk"),
    item("m-cold-coffee", "Cold Coffee", 40, "Beverages", "food/cold-coffee.jpg", "Chilled coffee blended with milk and ice.", true, true, "Library Kiosk"),
    item("m-mango-lassi", "Mango Lassi", 35, "Beverages", "food/mango-lassi.jpg", "Sweet mango yoghurt drink, served chilled.", true, true, "Library Kiosk")
  );

  const today = isoDate(new Date());
  const yesterday = isoDate(new Date(Date.now() - 86400000));
  const twoAgo = isoDate(new Date(Date.now() - 2 * 86400000));
  const threeAgo = isoDate(new Date(Date.now() - 3 * 86400000));

  const addOrder = (number, userId, date, slot, counter, ids, qtys, status, age) => {
    const owner = db.users.find((entry) => entry.id === userId);
    const lines = [];
    let total = 0;
    ids.forEach((id, index) => {
      const dish = db.menu.find((entry) => entry.id === id);
      if (!dish) return;
      const qty = qtys[index] || 1;
      lines.push({ itemId: dish.id, name: dish.name, price: dish.price, qty });
      total += dish.price * qty;
    });
    db.orders.push({
      id: `o-${number}`,
      code: `#${number}`,
      userId: owner.id,
      customerName: owner.name,
      rollNo: owner.rollNo,
      date,
      slot,
      counter,
      items: lines,
      total,
      status,
      createdAt: minutesAgo(age),
      cancelledAt: status === "Cancelled" ? minutesAgo(age) : "",
    });
  };

  addOrder(1001, "u-1", threeAgo, "01:00 PM - 01:30 PM", "North Block Counter", ["m-idli", "m-vada-pav"], [1, 1], "Cancelled", 4300);
  addOrder(1002, "u-1", twoAgo, "12:30 PM - 01:00 PM", "Main Canteen", ["m-veg-biryani", "m-gulab-jamun"], [1, 1], "Completed", 2900);
  addOrder(1003, "u-1", yesterday, "01:00 PM - 01:30 PM", "Main Canteen", ["m-paneer-paratha", "m-gulab-jamun"], [1, 1], "Completed", 1450);
  addOrder(1004, "u-1", today, "05:00 PM - 05:30 PM", "Main Canteen", ["m-veg-fried-rice", "m-veg-pulao", "m-gulab-jamun"], [1, 1, 2], "Confirmed", 180);
  addOrder(1005, "u-2", today, "12:30 PM - 01:00 PM", "Main Canteen", ["m-veg-biryani", "m-curd-rice"], [1, 1], "Confirmed", 95);
  addOrder(1006, "u-3", today, "11:30 AM - 12:00 PM", "Main Canteen", ["m-paneer-paratha", "m-gulab-jamun"], [2, 1], "Preparing", 140);
  addOrder(1007, "u-4", today, "12:30 PM - 01:00 PM", "Library Kiosk", ["m-lemon-tea", "m-cold-coffee", "m-masala-chai"], [1, 1, 1], "Ready", 70);
  addOrder(1008, "u-5", today, "08:30 AM - 09:00 AM", "North Block Counter", ["m-idli", "m-vada-pav"], [2, 1], "Completed", 380);
  addOrder(1009, "u-2", today, "03:30 PM - 04:00 PM", "North Block Counter", ["m-samosa", "m-aloo-sandwich"], [2, 1], "Cancelled", 300);
  addOrder(1010, "u-3", today, "01:00 PM - 01:30 PM", "Main Canteen", ["m-pav-bhaji", "m-gulab-jamun"], [1, 1], "Confirmed", 55);
  addOrder(1011, "u-6", yesterday, "12:30 PM - 01:00 PM", "Main Canteen", ["m-veg-fried-rice", "m-curd-rice"], [1, 1], "Completed", 1600);
  addOrder(1012, "u-7", twoAgo, "11:30 AM - 12:00 PM", "Main Canteen", ["m-chole-bhature", "m-gulab-jamun"], [1, 1], "Completed", 3100);
  addOrder(1013, "u-8", today, "12:30 PM - 01:00 PM", "North Block Counter", ["m-masala-dosa", "m-vada-pav"], [1, 1], "Ready", 45);
  addOrder(1014, "u-5", threeAgo, "01:00 PM - 01:30 PM", "Main Canteen", ["m-veg-pulao", "m-curd-rice"], [1, 1], "Completed", 4500);

  const addReview = (orderNo, itemId, rating, comment, age) => {
    const order = db.orders.find((entry) => entry.id === `o-${orderNo}`);
    if (!order) return;
    const line = order.items.find((entry) => entry.itemId === itemId);
    const owner = db.users.find((entry) => entry.id === order.userId);
    if (!line || !owner) return;
    db.reviews.push({
      id: `r-${orderNo}-${itemId.replace("m-", "")}`,
      orderId: order.id,
      orderCode: order.code,
      itemId: line.itemId,
      itemName: line.name,
      userId: owner.id,
      userName: owner.name,
      rating,
      comment,
      createdAt: minutesAgo(age),
    });
  };

  addReview(1002, "m-veg-biryani", 5, "Biryani was hot, fragrant and properly spiced.", 2600);
  addReview(1002, "m-gulab-jamun", 4, "Warm and not too sweet.", 2605);
  addReview(1003, "m-paneer-paratha", 4, "Generous stuffing, curd was a nice touch.", 1500);
  addReview(1008, "m-idli", 5, "Soft idlis and the sambar had real flavour.", 130);
  addReview(1008, "m-vada-pav", 4, "Crisp vada, soft pav and a good chutney.", 135);
  addReview(1011, "m-veg-fried-rice", 4, "Good portion and not too oily.", 1400);
  addReview(1011, "m-curd-rice", 3, "Curd rice was a bit plain today.", 1405);
  addReview(1012, "m-chole-bhature", 5, "Best chole bhature on campus.", 2800);
  addReview(1012, "m-gulab-jamun", 5, "Soft and warm, a nice finish.", 2805);
  addReview(1014, "m-veg-pulao", 3, "Nice flavour but a little dry.", 4300);
  addReview(1014, "m-curd-rice", 4, "Cooling and well seasoned.", 4305);

  return db;
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.menu)) {
        if (!Array.isArray(parsed.counters) || !parsed.counters.length) parsed.counters = [...COUNTERS];
        if (!Array.isArray(parsed.reviews)) parsed.reviews = [];
        if (!Array.isArray(parsed.orders)) parsed.orders = [];
        return parsed;
      }
    }
  } catch (error) {
    /* fall through to a fresh seed */
  }
  const fresh = seedDb();
  saveDb(fresh);
  return fresh;
}

function saveDb(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    /* storage may be unavailable in private mode; the session still works */
  }
}

function loadTokens() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOKENS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveTokens(tokens) {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch (error) {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const clone = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  rollNo: user.rollNo,
  department: user.department,
  phone: user.phone,
  canteen: user.canteen,
  active: user.active,
});
const findUser = (db, id) => db.users.find((user) => user.id === id) || null;
const findUserByEmail = (db, email) =>
  db.users.find((user) => user.email.toLowerCase() === String(email || "").trim().toLowerCase()) || null;
const findItem = (db, id) => db.menu.find((item) => item.id === id) || null;
const findOrder = (db, id) => db.orders.find((order) => order.id === id) || null;
const activeAdminCount = (db) => db.users.filter((user) => user.role === "admin" && user.active).length;
const byNewest = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const text = (value) => (value === undefined || value === null ? "" : String(value));

function currentUser(db, tokens, token) {
  const userId = token ? tokens[token] : null;
  const user = userId ? findUser(db, userId) : null;
  return user && user.active ? user : null;
}

function requireLogin(db, tokens, token) {
  const user = currentUser(db, tokens, token);
  if (!user) throw httpError(401, "Please sign in again.");
  return user;
}

function requireRole(db, tokens, token, role) {
  const user = requireLogin(db, tokens, token);
  if (user.role !== role) throw httpError(403, "You do not have access to that action.");
  return user;
}

/** Every account owner action is a signed-in user; admin actions check the role. */
function staffCanteen(db, user) {
  if (!user.canteen || !db.counters.includes(user.canteen)) {
    throw new Error("Your staff account is not linked to a canteen. Ask the admin to assign one.");
  }
  return user.canteen;
}

/* ------------------------------------------------------------------ */
/* Menu item parsing / validation                                      */
/* ------------------------------------------------------------------ */

function readMenuItem(db, body, base) {
  const name = text(body.name ?? base.name).trim();
  if (!name) throw new Error("Item name is required.");
  if (name.length > 60) throw new Error("Item name must be 60 characters or fewer.");

  const price = Math.trunc(Number(body.price ?? base.price));
  if (!Number.isFinite(price) || price < 1 || price > 5000) {
    throw new Error("Enter a price between 1 and 5000.");
  }

  const category = text(body.category ?? base.category);
  if (!CATEGORIES.includes(category)) throw new Error("Choose a valid category.");

  const image = text(body.image ?? base.image);
  if (!/^\/?food\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(image) || image.includes("..")) {
    throw new Error("Choose one of the canteen food photos.");
  }

  let description = text(body.description ?? base.description).trim();
  if (description.length > 160) description = description.slice(0, 160);

  let canteen = text(body.canteen ?? base.canteen).trim();
  if (!canteen && db.counters.length) canteen = db.counters[0];
  if (!db.counters.includes(canteen)) throw new Error("Choose a valid canteen for this dish.");

  return {
    name,
    price,
    category,
    image,
    description,
    veg: body.veg === undefined ? base.veg : Boolean(body.veg),
    available: body.available === undefined ? base.available : Boolean(body.available),
    canteen,
  };
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

function validateAccountFields(name, email, role, rollNo, department, phone) {
  if (name.length < 2 || name.length > 60) throw new Error("Enter the account holder's name.");
  if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
  if (!["student", "staff", "admin"].includes(role)) throw new Error("Choose a valid account type.");
  if (rollNo.length > 24 || department.length > 60 || phone.length > 24) {
    throw new Error("Keep the ID, department and phone short.");
  }
}

function createAccount(db, body) {
  const name = text(body.name).trim();
  const email = text(body.email).trim().toLowerCase();
  const password = text(body.password);
  const role = text(body.role).trim().toLowerCase() || "student";
  const rollNo = text(body.rollNo).trim();
  const department = text(body.department).trim();
  const phone = text(body.phone).trim();
  const canteen = text(body.canteen).trim();

  validateAccountFields(name, email, role, rollNo, department, phone);
  if (findUserByEmail(db, email)) throw new Error("An account with that email already exists.");
  if (password.length < 6 || password.length > 72) throw new Error("Password must be 6 to 72 characters.");
  if (role === "staff" && !db.counters.includes(canteen)) {
    throw new Error("Choose the canteen this staff account runs.");
  }

  const account = {
    id: uid("u"),
    name,
    email,
    password,
    role,
    rollNo,
    department,
    phone,
    canteen: role === "staff" ? canteen : "",
    active: true,
  };
  db.users.push(account);
  return account;
}

function updateAccount(db, admin, target, body) {
  const name = text(body.name ?? target.name).trim();
  const email = text(body.email ?? target.email).trim().toLowerCase();
  const role = text(body.role ?? target.role).trim().toLowerCase();
  const rollNo = text(body.rollNo ?? target.rollNo).trim();
  const department = text(body.department ?? target.department).trim();
  const phone = text(body.phone ?? target.phone).trim();
  const canteen = text(body.canteen ?? target.canteen).trim();
  const password = text(body.password);

  validateAccountFields(name, email, role, rollNo, department, phone);
  const other = findUserByEmail(db, email);
  if (other && other.id !== target.id) throw new Error("Another account already uses that email.");
  if (target.id === admin.id && role !== "admin") throw new Error("You cannot change your own account type.");
  if (target.role === "admin" && role !== "admin" && activeAdminCount(db) <= 1) {
    throw new Error("Keep at least one active admin account.");
  }
  if (role === "staff" && !db.counters.includes(canteen)) {
    throw new Error("Choose the canteen this staff account runs.");
  }
  if (password && (password.length < 6 || password.length > 72)) {
    throw new Error("Password must be 6 to 72 characters.");
  }

  target.name = name;
  target.email = email;
  target.role = role;
  target.rollNo = rollNo;
  target.department = department;
  target.phone = phone;
  target.canteen = role === "staff" ? canteen : "";
  if (password) target.password = password;
  return target;
}

/* ------------------------------------------------------------------ */
/* State payload                                                       */
/* ------------------------------------------------------------------ */

function statePayload(db, tokens, token) {
  const user = requireLogin(db, tokens, token);
  const today = isoDate(new Date());

  let visible;
  if (user.role === "student") {
    visible = db.orders.filter((order) => order.userId === user.id);
  } else if (user.role === "staff") {
    visible = db.orders.filter((order) => order.date >= today);
    if (user.canteen) visible = visible.filter((order) => order.counter === user.canteen);
  } else {
    visible = db.orders.slice();
  }
  visible = visible.slice().sort(byNewest);

  const now = new Date();
  const payload = {
    user: publicUser(user),
    menu: db.menu.map((item) => ({ ...item })),
    orders: visible.map((order) => ({ ...order, items: order.items.map((line) => ({ ...line })) })),
    reviews: db.reviews.map((review) => ({ ...review })),
    featuredId: db.featuredId,
    slots: [...TIME_SLOTS],
    counters: [...db.counters],
    categories: [...CATEGORIES],
    statuses: [...STATUSES],
    today,
    serverTime: now.getTime(),
    serverLocalTime: isoLocal(now),
  };
  if (user.role === "admin") payload.users = db.users.map(publicUser);
  return payload;
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

function createOrders(db, user, body) {
  const today = isoDate(new Date());
  const date = text(body.date) || today;
  const slot = text(body.slot);
  const now = new Date();

  if (date !== today) throw new Error("Orders can only be placed for today.");
  if (!TIME_SLOTS.includes(slot)) throw new Error("Choose a valid time slot.");
  if (slotStart(date, slot).getTime() <= now.getTime()) {
    throw new Error("That time slot has already started. Pick a later slot today.");
  }

  const lines = Array.isArray(body.items) ? body.items : [];
  const groups = new Map();
  let plates = 0;

  lines.forEach((line) => {
    const dish = findItem(db, text(line.itemId));
    if (!dish) return;
    if (!dish.available) throw new Error(`${dish.name} is sold out right now.`);
    const qty = Math.trunc(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
      throw new Error("Each item needs a quantity between 1 and 20.");
    }
    const canteen = dish.canteen || db.counters[0] || "Main Canteen";
    if (!groups.has(canteen)) groups.set(canteen, []);
    groups.get(canteen).push({ itemId: dish.id, name: dish.name, price: dish.price, qty });
    plates += qty;
  });

  if (!groups.size) throw new Error("Your cart is empty.");
  if (plates > 20) throw new Error("A single booking can hold at most 20 items.");

  const created = [];
  groups.forEach((orderLines, counter) => {
    const number = db.nextOrderNo++;
    const order = {
      id: `o-${number}`,
      code: `#${number}`,
      userId: user.id,
      customerName: user.name,
      rollNo: user.rollNo,
      date,
      slot,
      counter,
      items: orderLines,
      total: orderLines.reduce((sum, line) => sum + line.price * line.qty, 0),
      status: "Confirmed",
      createdAt: isoLocal(new Date()),
      cancelledAt: "",
    };
    db.orders.unshift(order);
    created.push(order);
  });

  return created;
}

function updateOrderStatus(db, user, order, body) {
  if (user.role !== "staff" && user.role !== "admin") {
    throw httpError(403, "Only canteen staff can update order status.");
  }
  const status = text(body.status);
  if (!STATUSES.includes(status)) throw new Error("Unknown order status.");
  if (order.status === "Completed" && user.role !== "admin") {
    throw new Error("Completed orders can no longer be changed.");
  }
  if (user.role === "staff") {
    const next = { Confirmed: "Preparing", Preparing: "Ready", Ready: "Completed" };
    const expected = next[order.status];
    if (status !== "Cancelled" && expected !== status) {
      throw new Error(`That status change is not allowed from ${order.status}.`);
    }
  }
  order.status = status;
  if (status !== "Cancelled") order.cancelledAt = "";
  return order;
}

function cancelOrder(db, user, order) {
  if (order.status === "Cancelled") throw new Error("This order is already cancelled.");
  if (order.status === "Completed") throw new Error("Completed orders cannot be cancelled.");
  if (user.role === "student") {
    if (order.userId !== user.id) throw httpError(403, "You can only cancel your own booking.");
    const inTime = slotStart(order.date, order.slot).getTime() > Date.now() + 3600000;
    if (order.status !== "Confirmed" || !inTime) {
      throw new Error("Orders can be cancelled up to 1 hour before the time slot.");
    }
  }
  order.status = "Cancelled";
  order.cancelledAt = isoLocal(new Date());
  return order;
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

/**
 * Handles one API call against browser storage.
 * Mirrors the JSON routes of the original server, including its error messages.
 */
export async function handle(method, path, body, token) {
  const db = loadDb();
  const tokens = loadTokens();
  const payload = body && typeof body === "object" ? body : {};
  const parts = String(path)
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));

  let result;
  let changed = false;

  const endpoint = parts[0] || "";
  const rest = parts.slice(1);

  switch (endpoint) {
    case "health":
      return { ok: true };

    case "login": {
      const email = text(payload.email).trim().toLowerCase();
      const password = text(payload.password);
      const user = findUserByEmail(db, email);
      if (!user || user.password !== password) throw httpError(401, "Incorrect email or password.");
      if (!user.active) throw httpError(403, "This account has been revoked. Contact the canteen admin.");
      const newToken = uid("t").replace(/-/g, "");
      tokens[newToken] = user.id;
      saveTokens(tokens);
      return { token: newToken, user: publicUser(user) };
    }

    case "logout": {
      const current = token ? tokens[token] : null;
      if (current) {
        delete tokens[token];
        saveTokens(tokens);
      }
      return { ok: true };
    }

    case "state":
      return statePayload(db, tokens, token);

    case "menu": {
      if (!rest.length) {
        const editor = requireLogin(db, tokens, token);
        if (editor.role !== "admin" && editor.role !== "staff") {
          throw httpError(403, "Only canteen staff or admins can add dishes.");
        }
        const parsed = readMenuItem(db, payload, {
          name: "",
          price: 0,
          category: "Lunch",
          image: "",
          description: "",
          veg: true,
          available: true,
          canteen: "",
        });
        const item = {
          id: uid("m"),
          ...parsed,
          canteen: editor.role === "staff" ? staffCanteen(db, editor) : parsed.canteen,
        };
        db.menu.push(item);
        changed = true;
        result = { item: { ...item } };
        break;
      }

      const id = rest[0];
      const existing = findItem(db, id);
      if (!existing) throw httpError(404, "Menu item not found.");

      if (rest.length === 1 && method === "PUT") {
        const editor = requireLogin(db, tokens, token);
        const admin = editor.role === "admin";
        const ownCanteen = editor.role === "staff" && existing.canteen === editor.canteen;
        if (!admin && !ownCanteen) throw httpError(403, "You can only edit dishes from your own canteen.");
        const originalCanteen = existing.canteen;
        const parsed = readMenuItem(db, payload, existing);
        Object.assign(existing, parsed, { id: existing.id });
        if (!admin) existing.canteen = originalCanteen;
        changed = true;
        result = { item: { ...existing } };
        break;
      }

      if (rest.length === 1 && method === "DELETE") {
        requireRole(db, tokens, token, "admin");
        db.menu = db.menu.filter((item) => item.id !== id);
        if (db.featuredId === id) {
          db.featuredId = (db.menu.find((item) => item.available) || {}).id || "";
        }
        changed = true;
        result = { ok: true };
        break;
      }

      if (rest.length === 2 && rest[1] === "availability") {
        const user = requireLogin(db, tokens, token);
        if (user.role !== "staff" && user.role !== "admin") {
          throw httpError(403, "Only canteen staff can change availability.");
        }
        if (user.role === "staff" && existing.canteen !== user.canteen) {
          throw httpError(403, "You can only change dishes from your own canteen.");
        }
        existing.available = payload.available === undefined ? existing.available : Boolean(payload.available);
        if (!existing.available && db.featuredId === id) {
          db.featuredId = (db.menu.find((item) => item.available) || {}).id || "";
        }
        changed = true;
        result = { item: { ...existing } };
        break;
      }

      if (rest.length === 2 && rest[1] === "featured") {
        requireRole(db, tokens, token, "admin");
        db.featuredId = id;
        changed = true;
        result = { featuredId: db.featuredId };
        break;
      }

      throw httpError(404, "Unknown menu endpoint");
    }

    case "orders": {
      if (!rest.length) {
        const user = requireRole(db, tokens, token, "student");
        const created = createOrders(db, user, payload);
        changed = true;
        result = { orders: created.map((order) => ({ ...order })), order: { ...created[0] } };
        break;
      }

      const order = findOrder(db, rest[0]);
      if (!order) throw httpError(404, "Order not found.");
      const user = requireLogin(db, tokens, token);

      if (rest[1] === "status") {
        updateOrderStatus(db, user, order, payload);
        changed = true;
        result = { order: { ...order } };
        break;
      }
      if (rest[1] === "cancel") {
        cancelOrder(db, user, order);
        changed = true;
        result = { order: { ...order } };
        break;
      }
      throw httpError(404, "Unknown order endpoint");
    }

    case "profile": {
      const user = requireLogin(db, tokens, token);
      const phone = text(payload.phone ?? user.phone).trim();
      if (phone.length > 24) throw new Error("Enter a shorter phone number.");
      user.phone = phone;
      changed = true;
      result = { user: publicUser(user) };
      break;
    }

    case "password": {
      const user = requireLogin(db, tokens, token);
      const current = text(payload.currentPassword);
      const next = text(payload.newPassword);
      if (user.password !== current) throw new Error("Your current password is not correct.");
      if (next.length < 6 || next.length > 72) throw new Error("The new password must be 6 to 72 characters.");
      if (next === current) throw new Error("Choose a password you have not used here before.");
      user.password = next;
      changed = true;
      result = { ok: true };
      break;
    }

    case "users": {
      if (!rest.length) {
        requireRole(db, tokens, token, "admin");
        if (method === "POST") {
          const account = createAccount(db, payload);
          changed = true;
          result = { user: publicUser(account) };
        } else {
          result = { users: db.users.map(publicUser) };
        }
        break;
      }

      const admin = requireRole(db, tokens, token, "admin");
      const target = findUser(db, rest[0]);
      if (!target) throw httpError(404, "Account not found.");

      if (rest.length === 1 && method === "PUT") {
        updateAccount(db, admin, target, payload);
        changed = true;
        result = { user: publicUser(target) };
        break;
      }

      if (rest.length === 2 && rest[1] === "status") {
        const active = payload.active === undefined ? target.active : Boolean(payload.active);
        if (!active) {
          if (target.id === admin.id) throw new Error("You cannot revoke your own account.");
          if (target.role === "admin" && target.active && activeAdminCount(db) <= 1) {
            throw new Error("Keep at least one active admin account.");
          }
        }
        target.active = active;
        if (!active) {
          Object.keys(tokens).forEach((key) => {
            if (tokens[key] === target.id) delete tokens[key];
          });
          saveTokens(tokens);
        }
        changed = true;
        result = { user: publicUser(target) };
        break;
      }

      if (rest.length === 1 && method === "DELETE") {
        if (target.id === admin.id) throw new Error("You cannot delete your own account.");
        if (target.role === "admin" && target.active && activeAdminCount(db) <= 1) {
          throw new Error("Keep at least one active admin account.");
        }
        db.users = db.users.filter((user) => user.id !== target.id);
        Object.keys(tokens).forEach((key) => {
          if (tokens[key] === target.id) delete tokens[key];
        });
        saveTokens(tokens);
        changed = true;
        result = { ok: true };
        break;
      }

      throw httpError(404, "Unknown account endpoint");
    }

    case "reviews": {
      if (!rest.length) {
        const user = requireRole(db, tokens, token, "student");
        const order = findOrder(db, text(payload.orderId));
        if (!order) throw httpError(404, "Order not found.");
        if (order.userId !== user.id) throw httpError(403, "You can only review your own meals.");
        if (order.status !== "Completed") throw new Error("You can review a dish once the order is collected.");
        const line = order.items.find((entry) => entry.itemId === text(payload.itemId));
        if (!line) throw new Error("That dish is not part of this order.");
        if (db.reviews.some((review) => review.orderId === order.id && review.itemId === line.itemId)) {
          throw new Error("You already reviewed this dish.");
        }
        const rating = Math.trunc(Number(payload.rating));
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
          throw new Error("Choose a rating from 1 to 5 stars.");
        }
        let comment = text(payload.comment).trim();
        if (comment.length > 160) comment = comment.slice(0, 160).trim();
        const review = {
          id: uid("r"),
          orderId: order.id,
          orderCode: order.code,
          itemId: line.itemId,
          itemName: line.name,
          userId: user.id,
          userName: user.name,
          rating,
          comment,
          createdAt: isoLocal(new Date()),
        };
        db.reviews.unshift(review);
        changed = true;
        result = { review };
        break;
      }

      requireRole(db, tokens, token, "admin");
      if (rest.length === 1 && method === "DELETE") {
        const before = db.reviews.length;
        db.reviews = db.reviews.filter((review) => review.id !== rest[0]);
        if (db.reviews.length === before) throw httpError(404, "Review not found.");
        changed = true;
        result = { ok: true };
        break;
      }
      throw httpError(404, "Unknown review endpoint");
    }

    case "counters": {
      requireRole(db, tokens, token, "admin");
      if (!rest.length) {
        const name = text(payload.name).trim().replace(/\s+/g, " ");
        if (name.length < 2 || name.length > 40) throw new Error("Counter name must be 2 to 40 characters.");
        if (db.counters.some((counter) => counter.toLowerCase() === name.toLowerCase())) {
          throw new Error("That counter already exists.");
        }
        db.counters.push(name);
        changed = true;
        result = { counters: [...db.counters] };
        break;
      }

      const name = rest[0];
      if (!db.counters.includes(name)) throw httpError(404, "Counter not found.");
      if (method === "DELETE") {
        if (db.counters.length <= 1) throw new Error("Keep at least one pickup counter.");
        const dishes = db.menu.filter((item) => item.canteen === name).length;
        if (dishes > 0) {
          throw new Error(
            `This canteen still sells ${dishes} dish${dishes === 1 ? "" : "es"}. Move them to another canteen first.`
          );
        }
        const today = isoDate(new Date());
        const booked = db.orders.filter(
          (order) => order.counter === name && order.date === today && order.status !== "Cancelled"
        ).length;
        if (booked > 0) {
          throw new Error(
            `This counter has ${booked} booking${booked === 1 ? "" : "s"} today. Move or cancel them first.`
          );
        }
        db.counters = db.counters.filter((counter) => counter !== name);
        changed = true;
        result = { counters: [...db.counters] };
        break;
      }
      throw httpError(404, "Unknown counter endpoint");
    }

    default:
      throw httpError(404, "Unknown endpoint");
  }

  if (changed) saveDb(db);
  return clone(result);
}
