import { z } from "zod";
import { ratingStars } from "@comtouz/domain";
import { readSession } from "@/lib/auth/session";
import { badRequest, serviceUnavailable, unauthorized } from "@/lib/http/responses";
import { createRating, listRecentRatings } from "@/lib/repositories/ratings";

const bodySchema = z.object({
  entitlementId: z.string().uuid(),
  stars: z.coerce
    .number()
    .int()
    .refine((value) => ratingStars.includes(value as (typeof ratingStars)[number]), "Invalid rating star value."),
  comment: z.string().max(400).optional()
});

export async function GET() {
  const session = await readSession();

  if (!session) {
    return unauthorized();
  }

  const ratings = await listRecentRatings(session.userId);
  return Response.json({ ratings });
}

export async function POST(request: Request) {
  const session = await readSession();

  if (!session) {
    return unauthorized();
  }

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    return badRequest("Invalid rating submission.", error);
  }

  try {
    const rating = await createRating({
      entitlementId: body.entitlementId,
      authorUserId: session.userId,
      stars: body.stars,
      comment: body.comment
    });

    if (!rating) {
      return serviceUnavailable("Rating entitlement not found or already used.");
    }

    return Response.json({ rating });
  } catch (error) {
    return serviceUnavailable(error instanceof Error ? error.message : "Rating submission failed.");
  }
}