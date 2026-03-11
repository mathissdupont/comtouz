import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";
import { resolveDisputeDirectly } from "@/lib/repositories/governance";

const bodySchema = z.object({
  disputeId: z.string().uuid(),
  resolutionNote: z.string().min(4).max(300)
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
    return badRequest("Invalid dispute resolution request.", error);
  }

  const dispute = await resolveDisputeDirectly(session.userId, body.disputeId, body.resolutionNote);

  if (!dispute) {
    return serviceUnavailable("Dispute could not be resolved directly.");
  }

  return Response.json({ dispute });
}