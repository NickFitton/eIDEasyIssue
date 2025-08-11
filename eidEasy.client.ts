import { createHmac } from "crypto";
import { AxiosError, type AxiosInstance } from "axios";

export interface File {
  // Base64 encoded contents
  fileContent: string;
  fileName: string;
  mimeType: "application/pdf";
}

export interface IEidEasy {
  /**
   *
   * @param fileContent A base64 encoded version of the pdf file
   */
  preparePdfFileForSigning(
    fileContent: string,
    fileName: string
  ): Promise<string>;
  sealDocument(documentId: string): Promise<void>;
  downloadSignedFile(documentId: string): Promise<string>;
}

interface PrepareFilesForSigningResponse {
  status: "OK" | string;
  doc_id: string;
  expires_at: string;
}

interface SignedFile {
  name: string;
  contents: string;
}
interface SignedFileResponse {
  status: string;
  filename: string;
  signer_idcode: string;
  signer_firstname: string;
  signer_lastname: string;
  signer_country: string;
  signing_method: string;
  signed_files: SignedFile[];
  signed_file_contents: string;
}

export class EidEasy implements IEidEasy {
  private readonly baseUrl: string;
  private readonly hmacKey: string;
  private readonly clientId: string;
  private readonly secret: string;
  private readonly axios: AxiosInstance;
  constructor(
    baseUrl: string,
    hmacKey: string,
    clientId: string,
    secret: string,
    axios: AxiosInstance
  ) {
    this.baseUrl = baseUrl;
    this.hmacKey = hmacKey;
    this.clientId = clientId;
    this.secret = secret;
    this.axios = axios;
  }

  async preparePdfFileForSigning(
    fileContent: string,
    fileName: string
  ): Promise<string> {
    const requestBody = {
      files: [
        {
          fileContent,
          fileName,
          mimeType: "applciation/pdf",
        },
      ],
      client_id: this.clientId,
      secret: this.secret,
      container_type: "pdf",
      show_visual: true,
      noemails: true,
    };

    const res = await this.request<PrepareFilesForSigningResponse>(
      "/api/signatures/prepare-files-for-signing",
      requestBody
    );

    if (res.data.status !== "OK") {
      throw new Error("Failed to create esign document");
    }

    return res.data.doc_id;
  }

  async sealDocument(documentId: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const hmac = this.buildSignature(
      documentId,
      timestamp,
      "/api/signatures/e-seal/create"
    );
    const requestBody = {
      client_id: this.clientId,
      secret: this.secret,
      doc_id: documentId,
      timestamp: timestamp,
      hmac: hmac,
    };

    await this.request<void>("/api/signatures/e-seal/create", requestBody);
  }

  async downloadSignedFile(documentId: string): Promise<string> {
    const requestBody = {
      client_id: this.clientId,
      secret: this.secret,
      doc_id: documentId,
    };

    const res = await this.request<SignedFileResponse>(
      "/api/signatures/download-signed-file",
      requestBody
    );

    if (res.data.status !== "OK") {
      throw new Error("Failed to fetch signed file");
    }

    return res.data.signed_file_contents;
  }

  private async request<R = object>(path: string, body: object) {
    try {
      return await this.axios<R>({
        url: `${this.baseUrl}${path}`,
        method: "POST",
        data: body,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    } catch (e: unknown) {
      if (e instanceof AxiosError) {
        console.log(await e.response.data);
        throw new Error("Request failed");
      }
      throw e;
    }
  }

  private buildSignature(
    docId: string,
    timestamp: number,
    path: string
  ): string {
    const data = [this.clientId, this.secret, docId, timestamp, path].join("");
    return createHmac("sha256", this.hmacKey)
      .update(data, "utf8")
      .digest("hex");
  }
}
