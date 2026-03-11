import { z } from "zod";
import { getEnv } from "@/lib/env";
import { persistSession } from "@/lib/auth/session";
import { badRequest, unauthorized } from "@/lib/http/responses";
import { upsertDevelopmentUser } from "@/lib/repositories/users";

const bodySchema = z.object({
  alias: z.string().min(2).max(40)
});

export async function POST(request: Request) {
  if (getEnv().NODE_ENV === "production") {
    return unauthorized("Development session bootstrap is disabled in production.");
  }

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return badRequest("Invalid development session request.", error);
  }

  const user = await upsertDevelopmentUser(body.alias);

  if (!user) {
    return unauthorized("Unable to create development session.");
  }

  await persistSession(user);

  return Response.json({ user, mode: "development" });
}