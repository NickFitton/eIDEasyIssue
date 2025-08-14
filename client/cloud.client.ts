import { type AxiosInstance } from "axios";
import { createHmac } from "crypto";
import { BaseEidEasyClient } from "./base.client.ts";

export interface File {
  // Base64 encoded contents
  fileContent: string;
  fileName: string;
  mimeType: "application/pdf";
}

export interface IEidEasy {
  /**
   * @param fileContent A base64 encoded version of the pdf file
   */
  preparePdfFileForSigning(
    fileContent: string,
    fileName: string
  ): Promise<PrepareFilesForSigningResponse>;
  sealDocument(documentId: string): Promise<void>;
  downloadSignedFile(documentId: string): Promise<SignedFileResponse>;
}

interface PrepareFilesForSigningResponse {
  doc_id: string;
  expires_at: string;
}

interface SignedFile {
  name: string;
  contents: string;
}
export interface PadesDssData {
  crls: string[];
  ocsps: string[];
  certificates: string[];
}
interface SignedFileResponse {
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
  pades_dss_data: PadesDssData;
  signed_files: SignedFile[];
}

export class EidEasy extends BaseEidEasyClient implements IEidEasy {
  private readonly clientId: string;
  private readonly secret: string;
  constructor(
    baseUrl: string,
    clientId: string,
    secret: string,
    axios: AxiosInstance
  ) {
    super(baseUrl, axios);
    this.clientId = clientId;
    this.secret = secret;
  }

  preparePdfFileForSigning(fileContent: string, fileName: string) {
    return this.request<PrepareFilesForSigningResponse>(
      "/api/signatures/prepare-files-for-signing",
      {
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
      }
    );
  }

  prepareDigestForSigning(
    digest: string,
    fileName: string
  ): Promise<PrepareFilesForSigningResponse> {
    return this.request<PrepareFilesForSigningResponse>(
      "/api/signatures/prepare-files-for-signing",
      {
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
      }
    );
  }

  sealDocument(documentId: string): Promise<void> {
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

    return this.request<void>("/api/signatures/e-seal/create", requestBody);
  }

  downloadSignedFile(documentId: string) {
    return this.request<SignedFileResponse>(
      "/api/signatures/download-signed-file",
      {
        client_id: this.clientId,
        secret: this.secret,
        doc_id: documentId,
      }
    );
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
