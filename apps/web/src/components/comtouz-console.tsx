"use client";

import { useEffect, useState, useTransition } from "react";
import { encounterContexts, lowRatingThreshold, platformName, ratingResolutionHours, ratingStars } from "@comtouz/domain";

type ApiUser = {
  userId: string;
  worldPassSubjectId: string;
  displayName?: string | null;
  countryCode?: string | null;
  reputationScore: number;
  effectiveWeight: number;
};

type OfferRecord = {
  nonce: string;
  initiatorUserId: string;
  counterpartUserId: string | null;
  channel: "qr" | "ble" | "nfc";
  offeredContexts: string;
  createdAt: string;
  expiresAt: string;
};

type EntitlementRecord = {
  entitlementId: string;
  encounterId: string;
  targetUserId: string;
  targetDisplayName: string | null;
  context: string;
  status: string;
  createdAt: string;
};

type RatingRecord = {
  ratingId: string;
  stars: number;
  state: string;
  category: string;
  comment?: string | null;
  createdAt: string;
  targetDisplayName: string | null;
  targetUserId: string;
  disputeId?: string | null;
};

type DisputeRecord = {
  disputeId: string;
  ratingId: string;
  status: string;
  category: string;
  authorUserId: string;
  targetUserId: string;
  openedAt: string;
  resolutionDeadline: string;
  replyMessage?: string | null;
  replySubmittedAt?: string | null;
  stars?: number | null;
  comment?: string | null;
  authorDisplayName?: string | null;
  targetDisplayName?: string | null;
  juryCaseId?: string | null;
  juryStatus?: string | null;
};

type JuryCaseRecord = {
  juryCaseId: string;
  disputeId: string;
  category: string;
  status: string;
  finalDecision?: string | null;
  votesCast: number;
  assignedJurors: number;
  authorDisplayName?: string | null;
  targetDisplayName?: string | null;
};

type BusinessRecord = {
  businessId: string;
  legalName: string;
  displayName: string;
  categories: string[];
  founderUserId: string;
  founderDisplayName?: string | null;
  employeeCount: number;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
};

const defaultActivity: ActivityItem[] = [
  {
    id: "trust",
    title: "Trust rule",
    detail: "Every rating must come from a finalized proof-of-encounter."
  },
  {
    id: "reply",
    title: "Right of reply",
    detail: `Ratings at ${lowRatingThreshold} stars or below remain pending for ${ratingResolutionHours} hours.`
  }
];

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function ComtouzConsole() {
  const [isPending, startTransition] = useTransition();
  const [me, setMe] = useState<ApiUser | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementRecord[]>([]);
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [juryCases, setJuryCases] = useState<JuryCaseRecord[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>(defaultActivity);
  const [devAlias, setDevAlias] = useState("Arda Foundry");
  const [offerNonce, setOfferNonce] = useState("");
  const [activeNonce, setActiveNonce] = useState("");
  const [offerChannel, setOfferChannel] = useState<"qr" | "ble" | "nfc">("qr");
  const [claimNonce, setClaimNonce] = useState("");
  const [selectedContexts, setSelectedContexts] = useState<string[]>(["business", "social"]);
  const [contextNonce, setContextNonce] = useState("");
  const [contextChoice, setContextChoice] = useState<(typeof encounterContexts)[number]>("business");
  const [negotiationNonce, setNegotiationNonce] = useState("");
  const [negotiationChoice, setNegotiationChoice] = useState<(typeof encounterContexts)[number]>("business");
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, { stars: number; comment: string }>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
  const [juryVoteDrafts, setJuryVoteDrafts] = useState<Record<string, { decision: "uphold" | "reject"; rationale: string }>>({});
  const [businessDraft, setBusinessDraft] = useState({ legalName: "", displayName: "", categories: "business" });
  const [employeeDraft, setEmployeeDraft] = useState({ businessId: "", employeeUserId: "", role: "associate" });

  const appendActivity = (title: string, detail: string) => {
    setActivity((current) => [{ id: crypto.randomUUID(), title, detail }, ...current].slice(0, 8));
  };

  const refreshAuthenticatedData = async () => {
    const [meResponse, ratingResponse, governanceResponse, businessResponse] = await Promise.all([
      readJson<{ user: ApiUser }>("/api/me"),
      readJson<{ entitlements: EntitlementRecord[]; ratings: RatingRecord[] }>("/api/ratings/entitlements"),
      readJson<{ disputes: DisputeRecord[]; juryCases: JuryCaseRecord[] }>("/api/disputes"),
      readJson<{ businesses: BusinessRecord[] }>("/api/businesses")
    ]);

    setMe(meResponse.user);
    setEntitlements(ratingResponse.entitlements);
    setRatings(ratingResponse.ratings);
    setDisputes(governanceResponse.disputes);
    setJuryCases(governanceResponse.juryCases);
    setBusinesses(businessResponse.businesses);
  };

  useEffect(() => {
    startTransition(() => {
      void refreshAuthenticatedData().catch(() => {
        setMe(null);
        setEntitlements([]);
        setRatings([]);
        setDisputes([]);
        setJuryCases([]);
        setBusinesses([]);
      });
    });
  }, []);

  const onDevLogin = async () => {
    startTransition(() => {
      void readJson<{ user: ApiUser }>("/api/auth/dev-session", {
        method: "POST",
        body: JSON.stringify({ alias: devAlias })
      })
        .then(async ({ user }) => {
          setMe(user);
          await refreshAuthenticatedData();
          appendActivity("Development identity ready", `${user.displayName ?? user.userId} can now issue and rate encounters.`);
        })
        .catch((error: Error) => {
          appendActivity("Auth error", error.message);
        });
    });
  };

  const onLogout = async () => {
    startTransition(() => {
      void readJson<void>("/api/auth/session", { method: "DELETE" })
        .then(() => {
          setMe(null);
          setEntitlements([]);
          setRatings([]);
          setDisputes([]);
          setJuryCases([]);
          setBusinesses([]);
          appendActivity("Session cleared", "Signed out of the local Comtouz session.");
        })
        .catch((error: Error) => appendActivity("Logout error", error.message));
    });
  };

  const onCreateOffer = async () => {
    startTransition(() => {
      void readJson<{ offer: OfferRecord }>("/api/encounters/offer", {
        method: "POST",
        body: JSON.stringify({ channel: offerChannel, offeredContexts: selectedContexts })
      })
        .then(({ offer }) => {
          setOfferNonce(offer.nonce);
          setActiveNonce(offer.nonce);
          setContextNonce(offer.nonce);
          appendActivity("Offer issued", `Nonce ${offer.nonce.slice(0, 8)}... is live for 60 seconds over ${offer.channel.toUpperCase()}.`);
        })
        .catch((error: Error) => appendActivity("Offer failed", error.message));
    });
  };

  const onClaim = async () => {
    startTransition(() => {
      void readJson<{ claim: { claimantUserId: string; offer: OfferRecord } }>("/api/encounters/claim", {
        method: "POST",
        body: JSON.stringify({ nonce: claimNonce })
      })
        .then(({ claim }) => {
          setActiveNonce(claim.offer.nonce);
          setContextNonce(claim.offer.nonce);
          setNegotiationNonce(claim.offer.nonce);
          appendActivity("Offer claimed", `Encounter ${claim.offer.nonce.slice(0, 8)}... has a counterparty and is ready for blind context selection.`);
        })
        .catch((error: Error) => appendActivity("Claim failed", error.message));
    });
  };

  const onSubmitContext = async () => {
    startTransition(() => {
      void readJson<{ status: string; encounter?: { encounterId: string }; negotiation?: { initiatorContext: string; claimantContext: string } }>("/api/encounters/context", {
        method: "POST",
        body: JSON.stringify({ nonce: contextNonce, context: contextChoice })
      })
        .then(async (result) => {
          if (result.status === "finalized") {
            await refreshAuthenticatedData();
            appendActivity("Encounter finalized", `Matched context locked and rating entitlements were minted for both participants.`);
            return;
          }

          if (result.status === "negotiation_required") {
            setNegotiationNonce(contextNonce);
            appendActivity("Negotiation opened", `Context mismatch detected: ${result.negotiation?.initiatorContext} vs ${result.negotiation?.claimantContext}.`);
            return;
          }

          appendActivity("Context stored", "Waiting for the counterparty to make their blind context selection.");
        })
        .catch((error: Error) => appendActivity("Context failed", error.message));
    });
  };

  const onNegotiate = async () => {
    startTransition(() => {
      void readJson<{ status: string }>("/api/encounters/negotiate", {
        method: "POST",
        body: JSON.stringify({ nonce: negotiationNonce, context: negotiationChoice })
      })
        .then(async (result) => {
          if (result.status === "finalized") {
            await refreshAuthenticatedData();
            appendActivity("Negotiation resolved", `Both parties converged on ${negotiationChoice}. Ratings are now unlocked.`);
            return;
          }

          appendActivity("Negotiation updated", `Proposal ${negotiationChoice} recorded. Waiting for the other participant.`);
        })
        .catch((error: Error) => appendActivity("Negotiation failed", error.message));
    });
  };

  const onSubmitRating = async (entitlementId: string) => {
    const draft = ratingDrafts[entitlementId] ?? { stars: 5, comment: "" };

    startTransition(() => {
      void readJson<{ rating: RatingRecord }>("/api/ratings", {
        method: "POST",
        body: JSON.stringify({ entitlementId, stars: draft.stars, comment: draft.comment })
      })
        .then(async ({ rating }) => {
          await refreshAuthenticatedData();
          appendActivity(
            "Rating submitted",
            rating.disputeId
              ? `${rating.stars} stars opened dispute ${rating.disputeId.slice(0, 8)}... and entered pending resolution.`
              : `${rating.stars} stars recorded in ${rating.state} state for ${rating.targetDisplayName ?? rating.targetUserId}.`
          );
        })
        .catch((error: Error) => appendActivity("Rating failed", error.message));
    });
  };

  const onReplyDispute = async (disputeId: string) => {
    const replyMessage = replyDrafts[disputeId]?.trim();

    if (!replyMessage) {
      appendActivity("Reply skipped", "Add a reply before submitting a right-of-reply response.");
      return;
    }

    startTransition(() => {
      void readJson<{ dispute: { disputeId: string; status: string } }>("/api/disputes/reply", {
        method: "POST",
        body: JSON.stringify({ disputeId, replyMessage })
      })
        .then(async ({ dispute }) => {
          await refreshAuthenticatedData();
          appendActivity("Right of reply submitted", `Dispute ${dispute.disputeId.slice(0, 8)}... is now ${dispute.status}.`);
        })
        .catch((error: Error) => appendActivity("Reply failed", error.message));
    });
  };

  const onResolveDispute = async (disputeId: string) => {
    const resolutionNote = resolutionDrafts[disputeId]?.trim();

    if (!resolutionNote) {
      appendActivity("Resolution skipped", "Add a resolution note before closing the dispute directly.");
      return;
    }

    startTransition(() => {
      void readJson<{ dispute: { disputeId: string; status: string } }>("/api/disputes/resolve", {
        method: "POST",
        body: JSON.stringify({ disputeId, resolutionNote })
      })
        .then(async ({ dispute }) => {
          await refreshAuthenticatedData();
          appendActivity("Dispute resolved", `Dispute ${dispute.disputeId.slice(0, 8)}... closed directly as ${dispute.status}.`);
        })
        .catch((error: Error) => appendActivity("Resolve failed", error.message));
    });
  };

  const onEscalateDispute = async (disputeId: string) => {
    startTransition(() => {
      void readJson<{ juryCase: JuryCaseRecord }>("/api/disputes/escalate", {
        method: "POST",
        body: JSON.stringify({ disputeId })
      })
        .then(async ({ juryCase }) => {
          await refreshAuthenticatedData();
          appendActivity("Jury assigned", `Jury case ${juryCase.juryCaseId.slice(0, 8)}... opened with ${juryCase.assignedJurors} assigned jurors.`);
        })
        .catch((error: Error) => appendActivity("Escalation failed", error.message));
    });
  };

  const onVoteJuryCase = async (juryCaseId: string) => {
    const draft = juryVoteDrafts[juryCaseId] ?? { decision: "uphold", rationale: "" };

    startTransition(() => {
      void readJson<{ juryCase: JuryCaseRecord | null }>("/api/jury/vote", {
        method: "POST",
        body: JSON.stringify({ juryCaseId, decision: draft.decision, rationale: draft.rationale })
      })
        .then(async ({ juryCase }) => {
          await refreshAuthenticatedData();
          appendActivity(
            "Jury vote recorded",
            juryCase?.status === "decided"
              ? `Jury case ${juryCase.juryCaseId.slice(0, 8)}... resolved with decision ${juryCase.finalDecision}.`
              : `Vote recorded for jury case ${juryCaseId.slice(0, 8)}...`
          );
        })
        .catch((error: Error) => appendActivity("Jury vote failed", error.message));
    });
  };

  const onCreateBusiness = async () => {
    const categories = businessDraft.categories
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    startTransition(() => {
      void readJson<{ business: BusinessRecord }>("/api/businesses", {
        method: "POST",
        body: JSON.stringify({
          legalName: businessDraft.legalName,
          displayName: businessDraft.displayName,
          categories
        })
      })
        .then(async ({ business }) => {
          await refreshAuthenticatedData();
          setEmployeeDraft((current) => ({ ...current, businessId: business.businessId }));
          appendActivity("Business created", `${business.displayName} is now linked to your verified founder identity.`);
        })
        .catch((error: Error) => appendActivity("Business creation failed", error.message));
    });
  };

  const onLinkEmployee = async () => {
    startTransition(() => {
      void readJson<{ link: { businessId: string; employeeUserId: string; role: string } }>("/api/businesses/employees", {
        method: "POST",
        body: JSON.stringify(employeeDraft)
      })
        .then(async ({ link }) => {
          await refreshAuthenticatedData();
          appendActivity("Employee linked", `User ${link.employeeUserId.slice(0, 8)}... now works at business ${link.businessId.slice(0, 8)}... as ${link.role}.`);
        })
        .catch((error: Error) => appendActivity("Employee link failed", error.message));
    });
  };

  return (
    <div className="console-shell">
      <section className="hero-panel reveal-up">
        <div className="hero-copy">
          <span className="eyebrow">Decentralized reputation cockpit</span>
          <h1>{platformName}</h1>
          <p>
            Verified identity, graph-native encounter proofs, double-blind context resolution, and conditional rating release now live in one interface.
          </p>
          <div className="hero-pills">
            <span className="hero-pill">Proof of encounter</span>
            <span className="hero-pill">Negotiation fallback</span>
            <span className="hero-pill">Pending-resolution ratings</span>
          </div>
        </div>
        <div className="hero-stat-grid">
          <div className="stat-card">
            <span>Open entitlements</span>
            <strong>{entitlements.length}</strong>
          </div>
          <div className="stat-card">
            <span>Recent ratings</span>
            <strong>{ratings.length}</strong>
          </div>
          <div className="stat-card">
            <span>Contexts</span>
            <strong>{encounterContexts.length}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <article className="panel reveal-up">
            <div className="panel-head">
              <div>
                <p className="kicker">Identity</p>
                <h2>Session control</h2>
              </div>
              <span className={`badge ${me ? "badge-live" : "badge-muted"}`}>{me ? "Authenticated" : "Offline"}</span>
            </div>
            {me ? (
              <div className="identity-card">
                <div>
                  <strong>{me.displayName ?? "Verified user"}</strong>
                  <p>{me.worldPassSubjectId}</p>
                </div>
                <div className="identity-meta">
                  <span>Weight {me.effectiveWeight.toFixed(1)}</span>
                  <span>Rep {me.reputationScore.toFixed(1)}</span>
                </div>
                <button className="ghost-button" onClick={onLogout} disabled={isPending}>
                  Sign out
                </button>
              </div>
            ) : (
              <div className="auth-stack">
                <p className="muted-copy">Development mode can mint a local session so the full handshake and rating flow is testable without a live WorldPass issuer.</p>
                <div className="field-row">
                  <input value={devAlias} onChange={(event) => setDevAlias(event.target.value)} placeholder="Choose a dev identity alias" />
                  <button className="primary-button" onClick={onDevLogin} disabled={isPending}>
                    Create dev session
                  </button>
                </div>
              </div>
            )}
          </article>

          <article className="panel reveal-up reveal-delay-1">
            <div className="panel-head">
              <div>
                <p className="kicker">Handshake</p>
                <h2>Offer, claim, and context</h2>
              </div>
              <span className="badge badge-accent">60 second live window</span>
            </div>
            <div className="workflow-grid">
              <section className="workflow-card">
                <h3>1. Offer</h3>
                <label>
                  Channel
                  <select value={offerChannel} onChange={(event) => setOfferChannel(event.target.value as "qr" | "ble" | "nfc") }>
                    <option value="qr">QR</option>
                    <option value="ble">BLE</option>
                    <option value="nfc">NFC</option>
                  </select>
                </label>
                <div>
                  <span className="field-label">Available contexts</span>
                  <div className="chip-row">
                    {encounterContexts.map((context) => {
                      const active = selectedContexts.includes(context);
                      return (
                        <button
                          key={context}
                          type="button"
                          className={`chip ${active ? "chip-active" : ""}`}
                          onClick={() =>
                            setSelectedContexts((current) =>
                              current.includes(context) ? current.filter((item) => item !== context) : [...current, context]
                            )
                          }
                        >
                          {context}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button className="primary-button" onClick={onCreateOffer} disabled={!me || isPending || selectedContexts.length === 0}>
                  Mint encounter offer
                </button>
                {offerNonce ? <p className="mono-callout">Active nonce: {offerNonce}</p> : null}
              </section>

              <section className="workflow-card">
                <h3>2. Claim</h3>
                <label>
                  Offer nonce
                  <input value={claimNonce} onChange={(event) => setClaimNonce(event.target.value)} placeholder="Paste encounter nonce" />
                </label>
                <button className="secondary-button" onClick={onClaim} disabled={!me || isPending || claimNonce.length === 0}>
                  Claim encounter
                </button>
              </section>

              <section className="workflow-card">
                <h3>3. Blind context</h3>
                <label>
                  Nonce
                  <input value={contextNonce} onChange={(event) => setContextNonce(event.target.value)} placeholder="Encounter nonce" />
                </label>
                <label>
                  My context
                  <select value={contextChoice} onChange={(event) => setContextChoice(event.target.value as (typeof encounterContexts)[number])}>
                    {encounterContexts.map((context) => (
                      <option key={context} value={context}>
                        {context}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="secondary-button" onClick={onSubmitContext} disabled={!me || isPending || contextNonce.length === 0}>
                  Submit blind context
                </button>
              </section>

              <section className="workflow-card workflow-card-alt">
                <h3>4. Negotiation fallback</h3>
                <label>
                  Negotiation nonce
                  <input value={negotiationNonce} onChange={(event) => setNegotiationNonce(event.target.value)} placeholder="Nonce requiring negotiation" />
                </label>
                <label>
                  Proposed context
                  <select value={negotiationChoice} onChange={(event) => setNegotiationChoice(event.target.value as (typeof encounterContexts)[number])}>
                    {encounterContexts.map((context) => (
                      <option key={context} value={context}>
                        {context}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary-button" onClick={onNegotiate} disabled={!me || isPending || negotiationNonce.length === 0}>
                  Submit negotiation choice
                </button>
                {activeNonce ? <p className="muted-copy">Current workflow nonce: {activeNonce}</p> : null}
              </section>
            </div>
          </article>

          <article className="panel reveal-up reveal-delay-2">
            <div className="panel-head">
              <div>
                <p className="kicker">Businesses</p>
                <h2>Founder-linked entities</h2>
              </div>
              <span className="badge badge-accent">Verified owner required</span>
            </div>
            <div className="dispute-grid">
              <section className="rating-column">
                <h3>Create business</h3>
                <label>
                  Legal name
                  <input value={businessDraft.legalName} onChange={(event) => setBusinessDraft((current) => ({ ...current, legalName: event.target.value }))} placeholder="Comtouz Labs LLC" />
                </label>
                <label>
                  Display name
                  <input value={businessDraft.displayName} onChange={(event) => setBusinessDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="Comtouz Labs" />
                </label>
                <label>
                  Categories
                  <input value={businessDraft.categories} onChange={(event) => setBusinessDraft((current) => ({ ...current, categories: event.target.value }))} placeholder="business, academic" />
                </label>
                <button className="primary-button" onClick={onCreateBusiness} disabled={!me || isPending}>
                  Create founder-linked business
                </button>
              </section>

              <section className="rating-column">
                <h3>Managed businesses</h3>
                {businesses.length === 0 ? <p className="muted-copy">Create a founder-linked business to start building the B2B trust graph.</p> : null}
                {businesses.map((business) => (
                  <div key={business.businessId} className="dispute-card">
                    <div className="timeline-card-head">
                      <div>
                        <strong>{business.displayName}</strong>
                        <p>{business.legalName}</p>
                      </div>
                      <span className="badge badge-live">{business.employeeCount} employees</span>
                    </div>
                    <p className="muted-copy">Categories: {business.categories.join(", ")}</p>
                    <button className="secondary-button" onClick={() => setEmployeeDraft((current) => ({ ...current, businessId: business.businessId }))}>
                      Use for employee link
                    </button>
                  </div>
                ))}
                <div className="jury-card">
                  <h3>Link employee</h3>
                  <label>
                    Business
                    <select value={employeeDraft.businessId} onChange={(event) => setEmployeeDraft((current) => ({ ...current, businessId: event.target.value }))}>
                      <option value="">Select business</option>
                      {businesses.map((business) => (
                        <option key={business.businessId} value={business.businessId}>
                          {business.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Employee user ID
                    <input value={employeeDraft.employeeUserId} onChange={(event) => setEmployeeDraft((current) => ({ ...current, employeeUserId: event.target.value }))} placeholder="Paste employee user UUID" />
                  </label>
                  <label>
                    Role
                    <input value={employeeDraft.role} onChange={(event) => setEmployeeDraft((current) => ({ ...current, role: event.target.value }))} placeholder="associate" />
                  </label>
                  <button className="secondary-button" onClick={onLinkEmployee} disabled={!me || isPending || !employeeDraft.businessId}>
                    Link employee
                  </button>
                </div>
              </section>
            </div>
          </article>

          <article className="panel reveal-up reveal-delay-3">
            <div className="panel-head">
              <div>
                <p className="kicker">Ratings</p>
                <h2>Entitlements and review release</h2>
              </div>
              <span className="badge badge-warning">{lowRatingThreshold} stars or below stays pending</span>
            </div>
            <div className="rating-grid">
              <section className="rating-column">
                <h3>Open entitlements</h3>
                {entitlements.length === 0 ? <p className="muted-copy">Finalize an encounter to mint rating rights.</p> : null}
                {entitlements.map((entitlement) => {
                  const draft = ratingDrafts[entitlement.entitlementId] ?? { stars: 5, comment: "" };
                  return (
                    <div key={entitlement.entitlementId} className="rating-card">
                      <div className="rating-card-head">
                        <div>
                          <strong>{entitlement.targetDisplayName ?? entitlement.targetUserId}</strong>
                          <p>{entitlement.context} encounter</p>
                        </div>
                        <span className="badge badge-muted">{entitlement.status}</span>
                      </div>
                      <div className="star-row">
                        {ratingStars.map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`star-button ${draft.stars === star ? "star-button-active" : ""}`}
                            onClick={() => setRatingDrafts((current) => ({ ...current, [entitlement.entitlementId]: { ...draft, stars: star } }))}
                          >
                            {star}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={draft.comment}
                        onChange={(event) =>
                          setRatingDrafts((current) => ({
                            ...current,
                            [entitlement.entitlementId]: { ...draft, comment: event.target.value }
                          }))
                        }
                        placeholder="What happened in this encounter?"
                      />
                      <button className="secondary-button" onClick={() => onSubmitRating(entitlement.entitlementId)} disabled={!me || isPending}>
                        Submit rating
                      </button>
                    </div>
                  );
                })}
              </section>

              <section className="rating-column">
                <h3>Recent ratings</h3>
                {ratings.length === 0 ? <p className="muted-copy">Your completed ratings will appear here.</p> : null}
                {ratings.map((rating) => (
                  <div key={rating.ratingId} className="timeline-card">
                    <div className="timeline-card-head">
                      <strong>{rating.targetDisplayName ?? "Counterparty"}</strong>
                      <span className={`badge ${rating.state === "pending_resolution" ? "badge-warning" : "badge-live"}`}>{rating.state}</span>
                    </div>
                    <p>{rating.stars} stars in {rating.category}</p>
                    {rating.comment ? <p className="muted-copy">{rating.comment}</p> : null}
                  </div>
                ))}
              </section>
            </div>
          </article>

          <article className="panel reveal-up reveal-delay-3">
            <div className="panel-head">
              <div>
                <p className="kicker">Governance</p>
                <h2>Disputes, reply, and jury</h2>
              </div>
              <span className="badge badge-warning">Low-score fairness loop</span>
            </div>
            <div className="dispute-grid">
              <section className="rating-column">
                <h3>Open disputes</h3>
                {disputes.length === 0 ? <p className="muted-copy">Pending disputes will appear here after low-score ratings.</p> : null}
                {disputes.map((dispute) => {
                  const isTarget = me?.userId === dispute.targetUserId;
                  const isAuthor = me?.userId === dispute.authorUserId;
                  return (
                    <div key={dispute.disputeId} className="dispute-card">
                      <div className="timeline-card-head">
                        <div>
                          <strong>{dispute.authorDisplayName ?? "Author"} vs {dispute.targetDisplayName ?? "Target"}</strong>
                          <p>{dispute.category} · {dispute.stars ?? "-"} stars</p>
                        </div>
                        <span className={`badge ${dispute.status.includes("jury") ? "badge-accent" : "badge-warning"}`}>{dispute.status}</span>
                      </div>
                      {dispute.comment ? <p className="muted-copy">Original note: {dispute.comment}</p> : null}
                      {dispute.replyMessage ? <p className="muted-copy">Reply: {dispute.replyMessage}</p> : null}
                      {isTarget ? (
                        <div className="action-stack">
                          <textarea
                            value={replyDrafts[dispute.disputeId] ?? dispute.replyMessage ?? ""}
                            onChange={(event) => setReplyDrafts((current) => ({ ...current, [dispute.disputeId]: event.target.value }))}
                            placeholder="Submit your right of reply"
                          />
                          <button className="secondary-button" onClick={() => onReplyDispute(dispute.disputeId)} disabled={isPending}>
                            Submit reply
                          </button>
                        </div>
                      ) : null}
                      {isAuthor ? (
                        <div className="action-stack">
                          <textarea
                            value={resolutionDrafts[dispute.disputeId] ?? ""}
                            onChange={(event) => setResolutionDrafts((current) => ({ ...current, [dispute.disputeId]: event.target.value }))}
                            placeholder="Add a resolution note if the reply settled the issue"
                          />
                          <div className="field-row">
                            <button className="secondary-button" onClick={() => onResolveDispute(dispute.disputeId)} disabled={isPending}>
                              Resolve directly
                            </button>
                            <button className="primary-button" onClick={() => onEscalateDispute(dispute.disputeId)} disabled={isPending}>
                              Escalate to jury
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </section>

              <section className="rating-column">
                <h3>Assigned jury cases</h3>
                {juryCases.length === 0 ? <p className="muted-copy">When you are selected as a juror, cases will appear here.</p> : null}
                {juryCases.map((juryCase) => {
                  const draft = juryVoteDrafts[juryCase.juryCaseId] ?? { decision: "uphold", rationale: "" };
                  return (
                    <div key={juryCase.juryCaseId} className="jury-card">
                      <div className="timeline-card-head">
                        <div>
                          <strong>{juryCase.authorDisplayName ?? "Author"} vs {juryCase.targetDisplayName ?? "Target"}</strong>
                          <p>{juryCase.category} · {juryCase.votesCast}/{juryCase.assignedJurors} votes</p>
                        </div>
                        <span className={`badge ${juryCase.status === "decided" ? "badge-live" : "badge-accent"}`}>{juryCase.status}</span>
                      </div>
                      {juryCase.status === "decided" ? <p className="muted-copy">Final decision: {juryCase.finalDecision}</p> : null}
                      {juryCase.status !== "decided" ? (
                        <div className="action-stack">
                          <div className="chip-row">
                            {(["uphold", "reject"] as const).map((decision) => (
                              <button
                                key={decision}
                                type="button"
                                className={`chip ${draft.decision === decision ? "chip-active" : ""}`}
                                onClick={() =>
                                  setJuryVoteDrafts((current) => ({
                                    ...current,
                                    [juryCase.juryCaseId]: { ...draft, decision }
                                  }))
                                }
                              >
                                {decision}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={draft.rationale}
                            onChange={(event) =>
                              setJuryVoteDrafts((current) => ({
                                ...current,
                                [juryCase.juryCaseId]: { ...draft, rationale: event.target.value }
                              }))
                            }
                            placeholder="Optional juror rationale"
                          />
                          <button className="primary-button" onClick={() => onVoteJuryCase(juryCase.juryCaseId)} disabled={isPending}>
                            Submit jury vote
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            </div>
          </article>
        </div>

        <aside className="workspace-side reveal-up reveal-delay-5">
          <article className="panel panel-dark">
            <div className="panel-head">
              <div>
                <p className="kicker kicker-bright">Activity</p>
                <h2>Trust event feed</h2>
              </div>
            </div>
            <div className="timeline">
              {activity.map((item) => (
                <div key={item.id} className="timeline-item">
                  <span className="timeline-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel reveal-up reveal-delay-4">
            <div className="panel-head">
              <div>
                <p className="kicker">System</p>
                <h2>Current rules</h2>
              </div>
            </div>
            <ul className="rule-list">
              <li>Identity roots are verified WorldPass subjects in production.</li>
              <li>Encounter offers expire in 60 seconds and are replay guarded.</li>
              <li>Context mismatches must converge before any rating rights are unlocked.</li>
              <li>Low ratings stay in pending resolution for reply and jury escalation.</li>
            </ul>
          </article>
        </aside>
      </section>
    </div>
  );
}