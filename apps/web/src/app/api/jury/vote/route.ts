import { z } from "zod";
import { juryDecisions } from "@comtouz/domain";
import { readSession } from "@/lib/auth/session";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";
import { voteOnJuryCase } from "@/lib/repositories/governance";

const bodySchema = z.object({
  juryCaseId: z.string().uuid(),
  decision: z.enum(juryDecisions),
  rationale: z.string().max(500).optional()
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
    return badRequest("Invalid jury vote request.", error);
  }

  const result = await voteOnJuryCase(session.userId, body.juryCaseId, body.decision, body.rationale);

  if (!result) {
    return serviceUnavailable("Jury vote could not be recorded.");
  }

  return Response.json(result);
}