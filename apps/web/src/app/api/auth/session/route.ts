import { clearSession, readSession } from "@/lib/auth/session";

export async function GET() {
  const session = await readSession();
  return Response.json({ authenticated: Boolean(session), session });
}

export async function DELETE() {
  await clearSession();
  return new Response(null, { status: 204 });
}