import { auth } from "./firebase.js";
import { AUTH_API_URL } from "../utils/constants.js";

export async function sendOtp() {
  const user = auth.currentUser;

  if (!user) {
    return {
      success: false,
      message: "You need to be signed in first"
    };
  }

  const token = await user.getIdToken();

  const url = `${AUTH_API_URL}/send-otp`;
  console.log("[sendOtp] request:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  console.log("[sendOtp] response:", response.status, data);

  return data;
}