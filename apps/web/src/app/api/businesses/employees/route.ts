import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";
import { linkEmployeeToBusiness } from "@/lib/repositories/businesses";

const bodySchema = z.object({
  businessId: z.string().uuid(),
  employeeUserId: z.string().uuid(),
  role: z.string().min(2).max(40)
});

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return unauthorized();
  }

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return badRequest("Invalid employee link request.", error);
  }

  const link = await linkEmployeeToBusiness(session.userId, body.businessId, body.employeeUserId, body.role);

  if (!link) {
    return serviceUnavailable("Employee could not be linked to the business.");
  }

  return Response.json({ link });
}