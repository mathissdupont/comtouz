import { z } from "zod";
import { persistSession } from "@/lib/auth/session";
import { verifyWorldPassIdToken } from "@/lib/auth/worldpass";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";
import { upsertWorldPassUser } from "@/lib/repositories/users";

const bodySchema = z.object({
  idToken: z.string().min(1)
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return badRequest("Invalid WorldPass login request.", error);
  }

  try {
    const profile = await verifyWorldPassIdToken(body.idToken);
    const user = await upsertWorldPassUser(profile);

    if (!user) {
      return serviceUnavailable("User bootstrap failed.");
    }

    await persistSession(user);

    return Response.json({ user });
  } catch (error) {
    return unauthorized(error instanceof Error ? error.message : "WorldPass verification failed.");
  }
}