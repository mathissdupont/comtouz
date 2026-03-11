import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";
import { replyToDispute } from "@/lib/repositories/governance";

const bodySchema = z.object({
  disputeId: z.string().uuid(),
  replyMessage: z.string().min(4).max(600)
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
    return badRequest("Invalid dispute reply request.", error);
  }

  const dispute = await replyToDispute(session.userId, body.disputeId, body.replyMessage);

  if (!dispute) {
    return serviceUnavailable("Dispute reply could not be recorded.");
  }

  return Response.json({ dispute });
}