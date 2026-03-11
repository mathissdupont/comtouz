import { z } from "zod";
import { encounterContexts } from "@comtouz/domain";
import { hasRequiredEdgeHeaders, readCloudflareHeaders } from "@comtouz/security";
import { readSession } from "@/lib/auth/session";
import { createEncounterOffer } from "@/lib/encounters/offers";
import { isProduction } from "@/lib/env";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";

const bodySchema = z.object({
  channel: z.enum(["qr", "ble", "nfc"]),
  counterpartUserId: z.string().uuid().optional(),
  offeredContexts: z.array(z.enum(encounterContexts)).min(1).max(encounterContexts.length).optional()
});

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return unauthorized();
  }

  const edgeSnapshot = readCloudflareHeaders(request.headers);
  if (isProduction() && !hasRequiredEdgeHeaders(edgeSnapshot)) {
    return badRequest("Cloudflare edge headers are required to mint an encounter offer.");
  }

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return badRequest("Invalid encounter offer request.", error);
  }

  try {
    const offer = await createEncounterOffer(session, {
      channel: body.channel,
      counterpartUserId: body.counterpartUserId,
      offeredContexts: body.offeredContexts,
      requestHeaders: request.headers
    });

    return Response.json({ offer });
  } catch (error) {
    return serviceUnavailable(error instanceof Error ? error.message : "Encounter offer creation failed.");
  }
}