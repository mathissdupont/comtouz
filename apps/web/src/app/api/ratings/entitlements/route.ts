import { readSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/http/responses";
import { listOpenEntitlements, listRecentRatings } from "@/lib/repositories/ratings";

export async function GET() {
  const session = await readSession();

  if (!session) {
    return unauthorized();
  }

  const [entitlements, ratings] = await Promise.all([
    listOpenEntitlements(session.userId),
    listRecentRatings(session.userId)
  ]);

  return Response.json({ entitlements, ratings });
}