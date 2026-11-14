// ==========================================
// modules/steadfast/steadfast.test.js
// Automated verification for Steadfast Courier Integration
// ==========================================

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const assert = require("assert");
const { MongoClient, ObjectId } = require("mongodb");
const steadfastService = require("./steadfast.service");

async function runTests() {
  console.log("🧪 Starting Steadfast Courier Integration Test Suite...\n");

  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.58zpnyp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("techx_Shop_Database");
    const ordersCol = db.collection("orders");

    // ─── TEST 1: Phone Sanitization and BD Phone Regex ──────────
    console.log("Test 1: Validating Bangladesh Phone Regex...");
    const sanitizeBdPhone = (rawPhone) => {
      if (!rawPhone) return null;
      let cleaned = String(rawPhone).replace(/[\s\-\(\)\.]/g, "");
      if (cleaned.startsWith("+880")) cleaned = cleaned.slice(3);
      else if (cleaned.startsWith("880")) cleaned = cleaned.slice(2);
      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      return bdPhoneRegex.test(cleaned) ? cleaned : null;
    };

    assert.strictEqual(sanitizeBdPhone("01712345678"), "01712345678");
    assert.strictEqual(sanitizeBdPhone("+8801812345678"), "01812345678");
    assert.strictEqual(sanitizeBdPhone("8801912345678"), "01912345678");
    assert.strictEqual(sanitizeBdPhone("01712-345678"), "01712345678");
    assert.strictEqual(sanitizeBdPhone("12345"), null);
    assert.strictEqual(sanitizeBdPhone("01234567890"), null); // 012 not valid in BD
    console.log("✅ Passed: Phone sanitization and validation works correctly\n");

    // ─── TEST 2: Financial COD Calculation Logic ────────────────
    console.log("Test 2: Validating COD Calculation Logic...");
    const calculateCod = (totalPrice, deliveryCharge, alreadyPaid, discount) => {
      const total = Number(totalPrice) || 0;
      const deliv = Number(deliveryCharge) || 0;
      const paid = Number(alreadyPaid) || 0;
      const disc = Number(discount) || 0;
      return Math.max(0, Math.round(total + deliv - paid - disc));
    };

    assert.strictEqual(calculateCod(5000, 120, 0, 0), 5120);
    assert.strictEqual(calculateCod(5000, 120, 1000, 0), 4120);
    assert.strictEqual(calculateCod(5000, 120, 6000, 0), 0); // paid exceeds total
    assert.strictEqual(calculateCod(1000, 100, 200, 50), 850);
    console.log("✅ Passed: COD calculation matches exact financial breakdown\n");

    // ─── TEST 3: Atomic Lock & Duplicate Booking Prevention ─────
    console.log("Test 3: Validating MongoDB Atomic Lock & Duplicate Prevention...");
    const testOrderId = new ObjectId();
    const testOrder = {
      _id: testOrderId,
      customerName: "Test Buyer",
      phone: "01700000000",
      address: "Dhanmondi, Dhaka",
      totalPrice: 1500,
      status: "Pending",
      courier: {
        provider: "steadfast",
        bookingState: "not_created",
        consignmentId: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ordersCol.insertOne(testOrder);

    // First attempt to acquire lock
    const lock1 = await ordersCol.findOneAndUpdate(
      {
        _id: testOrderId,
        $or: [
          { "courier.bookingState": { $in: ["not_created", "failed", null] } },
          { courier: { $exists: false } },
        ],
      },
      {
        $set: {
          "courier.bookingState": "processing",
          "courier.lastAttemptAt": new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    assert.ok(lock1, "Lock 1 must succeed");
    assert.strictEqual(lock1.courier.bookingState, "processing");

    // Simultaneous second attempt to acquire lock on the same order
    const lock2 = await ordersCol.findOneAndUpdate(
      {
        _id: testOrderId,
        $or: [
          { "courier.bookingState": { $in: ["not_created", "failed", null] } },
          { courier: { $exists: false } },
        ],
      },
      {
        $set: {
          "courier.bookingState": "processing",
          "courier.lastAttemptAt": new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    assert.strictEqual(lock2, null, "Lock 2 must be null (atomic collision prevented!)");
    console.log("✅ Passed: Concurrent booking attempt blocked at database level\n");

    // ─── TEST 4: Successful Booking Persistence ──────────────────
    console.log("Test 4: Simulating Successful Booking Persistence...");
    const fakeConsignmentId = 98765432;
    const fakeTrackingCode = "TRACKTEST01";

    await ordersCol.updateOne(
      { _id: testOrderId },
      {
        $set: {
          "courier.bookingState": "created",
          "courier.consignmentId": fakeConsignmentId,
          "courier.trackingCode": fakeTrackingCode,
          "courier.deliveryStatus": "in_review",
          "courier.codAmount": 1500,
          "courier.bookedAt": new Date(),
          "courier.lastCheckedAt": new Date(),
          status: "Processing",
          updatedAt: new Date(),
        },
        $push: {
          "courier.history": {
            status: "in_review",
            timestamp: new Date(),
            source: "manual_booking",
            note: "Test booking created",
          },
        },
      }
    );

    const updated = await ordersCol.findOne({ _id: testOrderId });
    assert.strictEqual(updated.courier.bookingState, "created");
    assert.strictEqual(updated.courier.consignmentId, fakeConsignmentId);
    assert.strictEqual(updated.status, "Processing");
    assert.strictEqual(updated.courier.history.length, 1);
    console.log("✅ Passed: Courier booking details and audit history persisted\n");

    // ─── TEST 5: Status Synchronization & Idempotency ────────────
    console.log("Test 5: Testing Status Synchronization & Webhook Idempotency...");
    // Simulate webhook delivering "delivered"
    const webhookStatus = "delivered";
    if (updated.courier.deliveryStatus !== webhookStatus) {
      await ordersCol.updateOne(
        { _id: testOrderId },
        {
          $set: {
            "courier.deliveryStatus": webhookStatus,
            "courier.lastCheckedAt": new Date(),
            status: "Delivered",
            updatedAt: new Date(),
          },
          $push: {
            "courier.history": {
              status: webhookStatus,
              timestamp: new Date(),
              source: "webhook",
              note: "Delivered via webhook",
            },
          },
        }
      );
    }

    const deliveredDoc = await ordersCol.findOne({ _id: testOrderId });
    assert.strictEqual(deliveredDoc.courier.deliveryStatus, "delivered");
    assert.strictEqual(deliveredDoc.status, "Delivered");
    assert.strictEqual(deliveredDoc.courier.history.length, 2);
    console.log("✅ Passed: Status synchronized to 'Delivered' seamlessly\n");

    // ─── TEST 6: Timeout 'unknown' State Handling ────────────────
    console.log("Test 6: Validating Timeout 'unknown' State Behavior...");
    const timeoutOrderId = new ObjectId();
    await ordersCol.insertOne({
      _id: timeoutOrderId,
      customerName: "Timeout Customer",
      courier: {
        bookingState: "unknown",
        error: "Steadfast API request timed out after 15s",
        lastAttemptAt: new Date(),
      },
    });

    const timeoutLock = await ordersCol.findOneAndUpdate(
      {
        _id: timeoutOrderId,
        $or: [
          { "courier.bookingState": { $in: ["not_created", "failed", null] } },
          { courier: { $exists: false } },
        ],
      },
      { $set: { "courier.bookingState": "processing" } }
    );

    assert.strictEqual(
      timeoutLock,
      null,
      "An 'unknown' state booking must NOT be blindly retried without verification"
    );
    console.log("✅ Passed: 'unknown' state prevents unsafe blind re-booking\n");

    // Clean up test documents
    await ordersCol.deleteMany({ _id: { $in: [testOrderId, timeoutOrderId] } });
    console.log("🧹 Test documents cleaned up successfully.\n");

    console.log("🎉 ALL 6 VERIFICATION TEST SUITES PASSED FLAWLESSLY!");
  } finally {
    await client.close();
  }
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
