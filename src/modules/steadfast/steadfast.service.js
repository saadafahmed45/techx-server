// ==========================================
// modules/steadfast/steadfast.service.js
// ==========================================

const TIMEOUT_MS = 15000;

// Merchant API credentials fallback for production deployment environments
const FALLBACK_API_KEY = "sl0vqkijxemkez4a6vgipkcqmbodl2lg";
const FALLBACK_SECRET_KEY = "rpdnt7anbx3ybn4z0kr628ft";
const FALLBACK_BASE_URL = "https://portal.packzy.com/api/v1";

class SteadfastService {
  constructor() {
    this.baseUrl = (
      process.env.STEADFAST_BASE_URL || FALLBACK_BASE_URL
    ).replace(/\/+$/, "");
    this.apiKey = process.env.STEADFAST_API_KEY || FALLBACK_API_KEY;
    this.secretKey = process.env.STEADFAST_SECRET_KEY || FALLBACK_SECRET_KEY;
  }

  /**
   * Helper to ensure valid credentials exist before attempting calls
   */
  _ensureConfigured() {
    let apiKey = process.env.STEADFAST_API_KEY || this.apiKey;
    let secretKey = process.env.STEADFAST_SECRET_KEY || this.secretKey;

    if (!apiKey || !secretKey) {
      // Re-read .env dynamically from disk in case .env was modified after server started
      try {
        const path = require("path");
        require("dotenv").config({
          path: path.resolve(__dirname, "../../../.env"),
          override: true,
        });
        apiKey = process.env.STEADFAST_API_KEY;
        secretKey = process.env.STEADFAST_SECRET_KEY;
      } catch {}
    }

    // Use default verified merchant credentials if not configured in environment
    if (!apiKey) apiKey = FALLBACK_API_KEY;
    if (!secretKey) secretKey = FALLBACK_SECRET_KEY;

    if (!apiKey || !secretKey) {
      const err = new Error(
        "Steadfast API credentials are missing. Please set STEADFAST_API_KEY and STEADFAST_SECRET_KEY in server environment."
      );
      err.code = "STEADFAST_NOT_CONFIGURED";
      err.status = 503;
      throw err;
    }

    return { apiKey, secretKey };
  }

  getBaseUrl() {
    let url = (process.env.STEADFAST_BASE_URL || this.baseUrl || "https://portal.packzy.com/api/v1").trim();
    // Safeguard: If someone mistakenly configured their own website or webhook URL as Steadfast base URL
    if (url.includes("vercel.app") || url.includes("localhost") || !url.includes("packzy.com")) {
      url = "https://portal.packzy.com/api/v1";
    }
    return url.replace(/\/+$/, "");
  }

  /**
   * Internal HTTP request handler with timeout and error mapping
   */
  async _request(endpoint, options = {}) {
    const { apiKey, secretKey } = this._ensureConfigured();
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      let data = null;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      // Steadfast returns status code in HTTP header and sometimes also inside payload body (e.g. data.status)
      if (!response.ok || (data && data.status && data.status >= 400)) {
        const errorMsg =
          data?.message ||
          (data?.errors ? JSON.stringify(data.errors) : null) ||
          `Steadfast API request failed with status ${response.status}`;

        const err = new Error(errorMsg);
        err.status = response.status || data?.status || 500;
        err.responseData = data;
        err.code = "STEADFAST_API_ERROR";
        throw err;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        const timeoutErr = new Error(
          `Steadfast API request timed out after ${TIMEOUT_MS / 1000}s`
        );
        timeoutErr.code = "ETIMEDOUT";
        timeoutErr.status = 504;
        throw timeoutErr;
      }

      throw error;
    }
  }

  /**
   * Create a parcel / consignment on Steadfast
   *
   * @param {Object} payload
   * @param {string} payload.invoice
   * @param {string} payload.recipient_name
   * @param {string} payload.recipient_phone
   * @param {string} payload.recipient_address
   * @param {number} payload.cod_amount
   * @param {string} [payload.note]
   * @param {string} [payload.item_description]
   * @returns {Promise<Object>}
   */
  async createOrder({
    invoice,
    recipient_name,
    recipient_phone,
    recipient_address,
    cod_amount,
    note = "",
    item_description = "",
  }) {
    const payload = {
      invoice: String(invoice).trim(),
      recipient_name: String(recipient_name).trim(),
      recipient_phone: String(recipient_phone).trim(),
      recipient_address: String(recipient_address).trim(),
      cod_amount: Math.round(Number(cod_amount) || 0),
      note: String(note || "").trim(),
    };

    if (item_description) {
      payload.item_description = String(item_description).trim();
    }

    return await this._request("/create_order", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Retrieve delivery status by Consignment ID (CID)
   */
  async getStatusByCid(consignmentId) {
    if (!consignmentId) {
      throw new Error("Consignment ID is required to fetch status");
    }
    return await this._request(`/status_by_cid/${consignmentId}`, {
      method: "GET",
    });
  }

  /**
   * Retrieve delivery status by merchant Invoice ID
   */
  async getStatusByInvoice(invoice) {
    if (!invoice) {
      throw new Error("Invoice ID is required to fetch status");
    }
    return await this._request(`/status_by_invoice/${encodeURIComponent(invoice)}`, {
      method: "GET",
    });
  }

  /**
   * Retrieve delivery status by Tracking Code
   */
  async getStatusByTrackingCode(trackingCode) {
    if (!trackingCode) {
      throw new Error("Tracking code is required to fetch status");
    }
    return await this._request(`/status_by_trackingcode/${encodeURIComponent(trackingCode)}`, {
      method: "GET",
    });
  }

  /**
   * Get Current Merchant Account Balance
   */
  async getBalance() {
    return await this._request("/get_balance", {
      method: "GET",
    });
  }
}

module.exports = new SteadfastService();
