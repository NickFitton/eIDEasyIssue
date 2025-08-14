import { type PadesDssData } from "./cloud.client.ts";
import { BaseEidEasyClient } from "./base.client.ts";

interface PrepareRequest {
  fileContent: string;
}
export interface PrepareResponse {
  signatureTime: number;
  digest: string;
  hexDigest: string;
}

interface CompleteRequest {
  fileContent: string;
  signatureValue: string;
  signatureTime: number;
  padesDssData: PadesDssData;
}
export interface CompleteResponse {
  signedFile: string;
}

export class EidLocalClient extends BaseEidEasyClient {
  async buildDigestForSigning(data: PrepareRequest) {
    return this.request<PrepareResponse>("/api/detached-pades/prepare", data);
  }

  async complete(data: CompleteRequest) {
    return this.request<CompleteResponse>("/api/detached-pades/complete", data);
  }
}
