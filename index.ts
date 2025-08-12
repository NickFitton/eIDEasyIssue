import { readFileSync, writeFileSync } from "fs";
import axios from "axios";
import { EidEasy } from "./eidEasy.client.ts";

const fileName = "Google.pdf";

const main = async () => {
  const file = readFileSync("./" + fileName);
  const client = new EidEasy(
    "https://test.eideasy.com",
    "7vlIio4m3Pt0y4T52mXbhlG6PxBh7a6Z",
    "3tPu87X8desK2caAReGjRRID32WtCA2q",
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
  writeFileSync("./output.pdf", output);
};

main();
