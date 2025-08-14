import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import { Signer, SUBFILTER_ETSI_CADES_DETACHED } from "@signpdf/utils";
import { createHash } from "crypto";
import signpdf, { SignPdf } from "@signpdf/signpdf";

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
}
export interface CompleteResponse {
  signedFile: string;
}

export class SignPdfClient {
  private readonly signPdf: SignPdf;
  constructor() {
    this.signPdf = new SignPdf();
  }
  public buildDigestForSigning({
    fileContent,
  }: PrepareRequest): PrepareResponse {
    const signatureTime = new Date();
    const pdfWithPlaceholder = this.buildPlaceholder(
      Buffer.from(fileContent, "base64"),
      signatureTime
    );
    const hexDigest = createHash("sha256")
      .update(pdfWithPlaceholder)
      .digest("hex");
    console.log(hexDigest);
    const digest = Buffer.from(hexDigest, "hex").toString("base64");

    return {
      signatureTime: signatureTime.getTime(),
      digest,
      hexDigest,
    };
  }
  public async complete({
    fileContent,
    signatureValue,
    signatureTime,
  }: CompleteRequest): Promise<CompleteResponse> {
    const pdfWithPlaceholder = this.buildPlaceholder(
      Buffer.from(fileContent, "base64"),
      new Date(signatureTime)
    );
    const signer = new Pksc7Signer(Buffer.from(signatureValue, "base64"));
    const signedPdf = await this.signPdf.sign(pdfWithPlaceholder, signer);

    return {
      signedFile: signedPdf.toString("base64"),
    };
  }

  private buildPlaceholder(content: Buffer, signatureTime: Date): Buffer {
    return plainAddPlaceholder({
      pdfBuffer: content,
      reason: "Sign pdf",
      contactInfo: "humaans",
      name: "Humaans",
      location: "London",
      subFilter: SUBFILTER_ETSI_CADES_DETACHED,
      signingTime: signatureTime,
    });
  }
}

export class Pksc7Signer extends Signer {
  private readonly pkcs12Buffer: Buffer;
  constructor(pkcs12Buffer: Buffer) {
    super();
    this.pkcs12Buffer = pkcs12Buffer;
  }

  sign(_pdfBuffer: Buffer, _signingTime: Date): Promise<Buffer> {
    return Promise.resolve(this.pkcs12Buffer);
  }
}
