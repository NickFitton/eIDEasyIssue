import { readFileSync, writeFileSync } from "fs";
import axios from "axios";
import dotenv from "dotenv";
import { EidEasy } from "./eidEasy.client.ts";

const fileName = "Google.pdf";

dotenv.config();
const main = async () => {
  const file = readFileSync("./" + fileName);
  const client = new EidEasy(
    "https://test.eideasy.com",
    process.env.CLIENT_ID!,
    process.env.MY_SECRET!,
    axios.create({})
  );

  console.log("preparePdfFileForSigning");
  const documentId = await client.preparePdfFileForSigning(
    file.toString("base64"),
    fileName
  );
  console.log("sealDocument");
  await client.sealDocument(documentId);
  console.log("downloadSignedFile");
  const output = await client.downloadSignedFile(documentId);
  if (output.status !== "OK") {
    throw new Error("Bad response");
  }
  writeFileSync(
    "./output.pdf",
    Buffer.from(output.signed_file_contents, "base64")
  );
};

main();
