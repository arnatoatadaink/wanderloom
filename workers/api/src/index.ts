export const API_WORKSPACE_READY = true;

export default {
  fetch(): Response {
    return Response.json({ ok: true });
  }
};
