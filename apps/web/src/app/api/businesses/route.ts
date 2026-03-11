import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";
import { createBusiness, listManagedBusinesses } from "@/lib/repositories/businesses";

const bodySchema = z.object({
  legalName: z.string().min(2).max(80),
  displayName: z.string().min(2).max(80),
  categories: z.array(z.string().min(2).max(30)).min(1).max(5)
});

export async function GET() {
  const session = await readSession();

  if (!session) {
    return unauthorized();
  }

  const businesses = await listManagedBusinesses(session.userId);
  return Response.json({ businesses });
}

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return unauthorized();
  }

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return badRequest("Invalid business creation request.", error);
  }

  const business = await createBusiness(session.userId, body.legalName, body.displayName, body.categories);

  if (!business) {
    return serviceUnavailable("Business could not be created.");
  }

  return Response.json({ business });
}