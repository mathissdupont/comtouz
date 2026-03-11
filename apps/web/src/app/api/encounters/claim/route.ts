import { z } from "zod";
import { readSession } from "@/lib/auth/session";
import { claimEncounterOffer } from "@/lib/encounters/claims";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";

const bodySchema = z.object({
  nonce: z.string().uuid()
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
    return badRequest("Invalid encounter claim request.", error);
  }

  try {
    const claim = await claimEncounterOffer(session, body.nonce);
    return Response.json({ claim });
  } catch (error) {
    return serviceUnavailable(error instanceof Error ? error.message : "Encounter claim failed.");
  }
}