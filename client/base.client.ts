import { type AxiosInstance } from "axios";

export type ApiResponse<D> =
  | { status: "ERROR"; message: string | null }
  | ({ status: "OK" } & D);

export class BaseEidEasyClient {
  private readonly baseUrl: string;
  private readonly axios: AxiosInstance;
  constructor(baseUrl: string, axios: AxiosInstance) {
    this.baseUrl = baseUrl;
    this.axios = axios;
  }

  async request<R, D = unknown>(path: string, data: D): Promise<R> {
    const response = await this.axios<ApiResponse<R>>({
      method: "POST",
      url: `${this.baseUrl}${path}`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data,
    });

    return this.pullDataFromResponse(response.data, path);
  }

  private pullDataFromResponse = <D>(
    response: ApiResponse<D>,
    path: string
  ): D => {
    if (response.status !== "OK") {
      throw new Error(`Request failed [${path}]`);
    }
    const { status, ...data } = response;
    return data as D;
  };
}
