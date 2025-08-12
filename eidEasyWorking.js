import moment from "moment";
import { createHmac } from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

function buildSignature(clientId, secret, docId, timestamp, path) {
  let hmacKey = secret;

  // Existing snippet
  const data = [clientId, secret, docId, timestamp, path].join("");
  const nodeJsSignature = createHmac("sha256", hmacKey)
    .update(data, "utf8")
    .digest("hex");

  return nodeJsSignature;
}

// And I called the function here:

let timestampValue = moment(new Date().toUTCString()).valueOf() / 1000;
let clientIdValue = process.env.CLIENT_ID;
let secretValue = process.env.MY_SECRET;
let docIdValue = "Ud4XtDCvLhGOclQgg8P0rQGSgquVyX5G8pEuTuh7";

let signature = buildSignature(
  clientIdValue,
  secretValue,
  docIdValue,
  timestampValue,
  "/api/signatures/e-seal/create"
);

const response = await axios.post(
  "https://test.eideasy.com/api/signatures/e-seal/create",
  {
    signature: signature,
    timestamp: timestampValue,
    client_id: process.env.CLIENT_ID,
    secret: process.env.MY_SECRET,
    doc_id: docIdValue,
    hmac: signature,
  },
  {
    headers: {
      "Content-Type": "application/json",
    },
  }
);

console.log("Response status:", response.status);
console.log("Response data:", response.data);
