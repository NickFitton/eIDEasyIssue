import { type AxiosInstance } from "axios";
import { createHmac } from "crypto";

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
  downloadSignedFile(documentId: string): Promise<SignedFileResponse>;
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
export interface DssData {
  crls: string[];
  ocsps: string[];
  certificates: string[];
}
type SignedFileResponse =
  | {
      status: "OK";
      signed_file_contents: string;
      filename: string;
      signer_idcode: string;
      signer_country: string;
      signer_firstname: string;
      signer_lastname: string;
      signing_method: string;
      verification_level: string | null;
      signer_gender: string | null;
      signer_ip_address: string;
      signer_user_agent: string;
      pades_dss_data: DssData;
      signed_files: SignedFile[];
    }
  | { status: "ERROR"; message: string };

export class EidEasy implements IEidEasy {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly secret: string;
  private readonly axios: AxiosInstance;
  constructor(
    baseUrl: string,
    clientId: string,
    secret: string,
    axios: AxiosInstance
  ) {
    this.baseUrl = baseUrl;
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
          mimeType: "application/pdf",
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

  async prepareDigestForSigning(
    digest: string,
    fileName: string
  ): Promise<PrepareFilesForSigningResponse> {
    const requestBody = {
      files: [
        {
          fileContent: digest,
          fileName,
          mimeType: "application/pdf",
        },
      ],
      client_id: this.clientId,
      secret: this.secret,
      container_type: "cades",
      baseline: "LT",
    };

    const res = await this.request<PrepareFilesForSigningResponse>(
      "/api/signatures/prepare-files-for-signing",
      requestBody
    );

    return res.data;
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

  async downloadSignedFile(documentId: string): Promise<SignedFileResponse> {
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

    return res.data;
  }

  private async request<R = object>(path: string, body: object) {
    return await this.axios<R>({
      url: `${this.baseUrl}${path}`,
      method: "POST",
      data: body,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  private buildSignature(
    docId: string,
    timestamp: number,
    path: string
  ): string {
    const data = [this.clientId, this.secret, docId, timestamp, path].join("");
    return createHmac("sha256", this.secret).update(data, "utf8").digest("hex");
  }
}
