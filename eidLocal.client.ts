import { type AxiosInstance } from "axios";
import { type DssData } from "./eidEasy.client.ts";

export type PrepareResponse =
  | {
      status: "OK";
      signatureTime: number;
      digest: string;
      hexDigest: string;
    }
  | { status: "ERROR"; message: string };

export type CompleteResponse =
  | { status: "OK"; signedFile: string }
  | { status: "ERROR"; message: string };

export class EidLocalClient {
  private readonly baseUrl: string;
  private readonly axios: AxiosInstance;
  constructor(baseUrl: string, axios: AxiosInstance) {
    this.baseUrl = baseUrl;
    this.axios = axios;
  }

  async buildDigestForSigning(data: { fileContent: string }) {
    const response = await this.axios<PrepareResponse>({
      method: "POST",
      url: `${this.baseUrl}/api/detached-pades/prepare`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data,
    });

    return response.data;
  }

  async complete(data: {
    fileContent: string;
    signatureValue: string;
    signatureTime: number;
    padesDssData: DssData;
  }) {
    const response = await this.axios<CompleteResponse>({
      method: "POST",
      url: `${this.baseUrl}/api/detached-pades/complete`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data,
    });

    return response.data;
  }
}
