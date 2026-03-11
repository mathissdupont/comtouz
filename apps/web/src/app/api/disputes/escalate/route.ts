import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";
import { escalateDisputeToJury } from "@/lib/repositories/governance";

const bodySchema = z.object({
  disputeId: z.string().uuid()
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
    return badRequest("Invalid dispute escalation request.", error);
  }

  const juryCase = await escalateDisputeToJury(session.userId, body.disputeId);

  if (!juryCase) {
    return serviceUnavailable("Jury escalation could not be created.");
  }

  return Response.json({ juryCase });
}