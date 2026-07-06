import { IMAGE_API_URL } from "../utils/constants.js";
import { getToken } from "../auth/getToken.js";

export async function getGeneratedImage(prompt) {
  const token = await getToken();

  const response = await fetch(IMAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    let errorMessage = "Request failed";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
    }

    throw new Error(errorMessage);
  }

  return response.json();
}
