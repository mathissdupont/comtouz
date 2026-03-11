import { readSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/http/responses";
import { findUserById } from "@/lib/repositories/users";

export async function GET() {
  const session = await readSession();

  if (!session) {
    return unauthorized();
  }

  const user = await findUserById(session.userId);

  if (!user) {
    return unauthorized("Session user no longer exists.");
  }

  return Response.json({ user });
}