// Session + request helper for the browser-only canteen.
// The original project sent these calls to a Java server; here they are answered
// by js/backend.js using localStorage, so the same UI code works with no server.
import { handle } from "./backend.js";

const TOKEN_KEY = "canteen.token";

export const session = {
  get token() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (error) {
      return "";
    }
  },
  set token(value) {
    try {
      if (value) {
        localStorage.setItem(TOKEN_KEY, value);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      /* storage can be unavailable in private mode */
    }
  },
};

export async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const data = await handle(method, path, options.body, session.token);
  return data || {};
}
