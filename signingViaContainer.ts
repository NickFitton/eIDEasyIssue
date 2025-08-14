import axios from "axios";
import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { EidLocalClient } from "./eidLocal.client.ts";
import { EidEasy } from "./eidEasy.client.ts";

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
  const prepareRepsonse = await localClient.buildDigestForSigning({
    fileContent,
  });
  if (prepareRepsonse.status !== "OK") {
    throw new Error(
      "An issue occured whilst sealing PDF [Could not build digest]."
    );
  }
  console.log(prepareRepsonse);
  const { signatureTime, digest } = prepareRepsonse;

  const getDocumentIdByDigest = await cloudClient.prepareDigestForSigning(
    digest,
    fileName
  );
  if (getDocumentIdByDigest.status !== "OK") {
    throw new Error("[Could not build doc_id]");
  }
  console.log(getDocumentIdByDigest);
  const { doc_id: documentId } = getDocumentIdByDigest;

  await cloudClient.sealDocument(documentId);

  const signedFileResponse = await cloudClient.downloadSignedFile(documentId);
  if (signedFileResponse.status !== "OK") {
    throw new Error(
      "An issue occured whilst sealing PDF [Could not get signed file response]."
    );
  }
  console.log(signedFileResponse);
  const { signed_file_contents: signatureValue, pades_dss_data: padesDssData } =
    signedFileResponse;

  const completeDocument = await localClient.complete({
    fileContent,
    signatureValue,
    signatureTime,
    padesDssData,
  });
  if (completeDocument.status !== "OK") {
    throw new Error(
      "An issue occured whilst sealing PDF [Could not build signed file]."
    );
  }
  console.log(completeDocument);
  writeFileSync(
    "./Signed" + fileName,
    Buffer.from(completeDocument.signedFile, "base64").toString("ascii")
  );
};
main();
