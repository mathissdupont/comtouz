import { readSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/http/responses";
import { listAssignedJuryCases, listUserDisputes } from "@/lib/repositories/governance";

export async function GET() {
  const session = await readSession();

  if (!session) {
    return unauthorized();
  }

  const [disputes, juryCases] = await Promise.all([
    listUserDisputes(session.userId),
    listAssignedJuryCases(session.userId)
  ]);

  return Response.json({ disputes, juryCases });
}