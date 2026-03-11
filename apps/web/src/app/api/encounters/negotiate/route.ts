import { z } from "zod";
import { encounterContexts } from "@comtouz/domain";
import { readSession } from "@/lib/auth/session";
import { negotiateEncounterContext } from "@/lib/encounters/context";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";

const bodySchema = z.object({
  nonce: z.string().uuid(),
  context: z.enum(encounterContexts)
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
    return badRequest("Invalid encounter negotiation request.", error);
  }

  try {
    const result = await negotiateEncounterContext(session, body.nonce, body.context);
    return Response.json(result);
  } catch (error) {
    return serviceUnavailable(error instanceof Error ? error.message : "Encounter negotiation failed.");
  }
}