import { NextResponse } from "next/server";

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "Authentication is required.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "You do not have permission to perform this action.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "The requested resource was not found.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serviceUnavailable(message: string) {
  return NextResponse.json({ error: message }, { status: 503 });
}