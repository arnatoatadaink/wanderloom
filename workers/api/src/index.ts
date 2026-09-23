import { createApi, type ApiEnv } from "./api";

const api = createApi();

export default {
  fetch(request: Request, env: ApiEnv): Promise<Response> {
    return api.fetch(request, env);
  }
};
