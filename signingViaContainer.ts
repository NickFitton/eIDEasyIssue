import axios from "axios";
import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { EidLocalClient } from "./client/local.client.ts";
import { EidEasy } from "./client/cloud.client.ts";

dotenv.config();
const fileName = "Google.pdf";

const main = async () => {
  const fileContent = readFileSync("./" + fileName).toString("base64");
  const localClient = new EidLocalClient(
    `http://localhost:8080`,
    axios.create({})
  );
  const cloudClient = new EidEasy(
    "https://test.eideasy.com",
    process.env.CLIENT_ID!,
    process.env.MY_SECRET!,
    axios.create({})
  );
  const { signatureTime, digest } = await localClient.buildDigestForSigning({
    fileContent,
  });

  const { doc_id: documentId } = await cloudClient.prepareDigestForSigning(
    digest,
    fileName
  );

  await cloudClient.sealDocument(documentId);

  const { signed_file_contents: signatureValue, pades_dss_data: padesDssData } =
    await cloudClient.downloadSignedFile(documentId);

  const completeResponse = await localClient.complete({
    fileContent,
    signatureValue,
    signatureTime,
    padesDssData,
  });

  writeFileSync(
    "./signedSealedDelivered.pdf",
    Buffer.from(completeResponse.signedFile, "base64")
  );
};
main();
