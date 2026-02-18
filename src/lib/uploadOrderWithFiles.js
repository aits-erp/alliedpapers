// lib/uploadOrderWithFiles.js
import axios from "axios";

export const uploadOrderWithFiles = async (url, formData, attachments, token) => {
  try {
    const body = new FormData();
    body.append("orderData", JSON.stringify(formData));
    attachments.forEach((file) => {
      body.append("newFiles", file);
    });

    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': undefined, // Let axios set the correct boundary
      },
      // Optional: 10s timeout for request
    });

    return response.data;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
};
