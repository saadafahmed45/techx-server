const cloudinary = require("../config/cloudinary");

/**
 * Extracts the Cloudinary public_id from a secure URL.
 * Example input: https://res.cloudinary.com/cloud-name/image/upload/v1612345678/products/abcde12345.jpg
 * Output: products/abcde12345
 * @param {string} url - The Cloudinary image URL
 * @returns {string|null} - The public_id or null if parsing fails
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== "string") return null;

  // Split by "/image/upload/" to isolate the folder and filename path
  const parts = url.split("/image/upload/");
  if (parts.length < 2) return null;

  let filePath = parts[1];

  // Remove the version prefix if it exists (e.g., v1612345678/)
  filePath = filePath.replace(/^v\d+\//, "");

  // Remove the file extension (e.g., .jpg, .png, .webp)
  const lastDotIndex = filePath.lastIndexOf(".");
  if (lastDotIndex !== -1) {
    filePath = filePath.substring(0, lastDotIndex);
  }

  return filePath;
};

/**
 * Deletes a single image from Cloudinary using its secure URL.
 * @param {string} url - The Cloudinary image URL
 * @returns {Promise<boolean>} - True if deletion was successful, false otherwise
 */
const deleteFromCloudinary = async (url) => {
  try {
    const publicId = extractPublicId(url);
    if (!publicId) return false;

    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("❌ Cloudinary deletion error:", error.message);
    return false;
  }
};

/**
 * Deletes multiple images from Cloudinary concurrently.
 * @param {string[]} urls - Array of Cloudinary image URLs
 * @returns {Promise<PromiseSettledResult<boolean>[]>}
 */
const deleteManyFromCloudinary = async (urls) => {
  if (!Array.isArray(urls) || urls.length === 0) return [];
  return Promise.allSettled(urls.map((url) => deleteFromCloudinary(url)));
};

module.exports = {
  extractPublicId,
  deleteFromCloudinary,
  deleteManyFromCloudinary,
};
