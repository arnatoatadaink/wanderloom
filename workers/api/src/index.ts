import { createApi, type ApiEnv } from "./api";

export const API_WORKSPACE_READY = true;

const api = createApi();

export default {
  fetch(request: Request, env: ApiEnv): Promise<Response> {
    return api.fetch(request, env);
  }
};
