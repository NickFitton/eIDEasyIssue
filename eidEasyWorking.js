import moment from "moment";
import { createHmac } from "crypto";
import axios from "axios";
import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();
const fileName = "Google.pdf";

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

let clientIdValue = process.env.CLIENT_ID;
let secretValue = process.env.MY_SECRET;

const file = readFileSync("./" + fileName);
const requestBody = {
  files: [
    {
      fileContent: file.toString("base64"),
      fileName,
      mimeType: "application/pdf",
    },
  ],
  client_id: clientIdValue,
  secret: secretValue,
  container_type: "pdf",
  show_visual: true,
  noemails: true,
};

const res = await axios.post(
  "https://test.eideasy.com/api/signatures/prepare-files-for-signing",
  requestBody,
  {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  }
);

if (res.data.status !== "OK") {
  throw new Error("Failed to create esign document");
}
let docIdValue = res.data.doc_id;
let timestampValue = moment(new Date().toUTCString()).valueOf() / 1000;

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
