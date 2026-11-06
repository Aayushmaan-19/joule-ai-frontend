import { BACKEND_BASE_URL } from "../utils/constants.js";
import { getToken } from "../auth/getToken.js";

const ADMIN_URL = `${BACKEND_BASE_URL}/api/admin`;

async function call(method, path) {
  const token = await getToken();

  const response = await fetch(`${ADMIN_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

export const listUsers = query => call("GET", `/users?q=${encodeURIComponent(query)}`);
export const getUser = uid => call("GET", `/users/${uid}`);
export const acceptRequest = (uid, requesterUid) => call("POST", `/users/${uid}/requests/${requesterUid}/accept`);
export const declineRequest = (uid, requesterUid) => call("POST", `/users/${uid}/requests/${requesterUid}/decline`);
export const impersonate = uid => call("POST", `/users/${uid}/impersonate`);
export const exitImpersonation = () => call("POST", "/impersonation/exit");
export const organizeDatabase = () => call("POST", "/organize");
export const getAudit = () => call("GET", "/audit");
