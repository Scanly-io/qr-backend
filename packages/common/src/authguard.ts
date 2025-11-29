import { verifyJwtToken } from "./jwthelper";

export async function authGuard(req: any, reply: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing or invalid Authorization header" });
    return; // ensure route handler does not run
  }

  const token = auth.slice("Bearer ".length).trim();
  if (!token) {
    reply.code(401).send({ error: "Empty bearer token" });
    return;
  }

  try {
    const payload = verifyJwtToken(token);
    (req as any).user = { id: payload.sub, email: payload.email };
  } catch (err) {
    reply.code(401).send({ error: "Invalid token" });
    return;
  }
}
