import "dotenv/config";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";

function required(name: string) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

export type GraphRecipient = {
    emailAddress: { address: string; name?: string };
};

export type GraphBody = {
    contentType: "HTML" | "Text";
    content: string;
};

function graphErr(e: unknown): Error {
    if (e instanceof Error) return e;
    return new Error(String(e));
}

export type GraphMessage = {
    id: string;
    subject?: string;
    conversationId?: string;
    receivedDateTime?: string;
    sentDateTime?: string;
    from?: unknown;
    toRecipients?: unknown[];
    ccRecipients?: unknown[];
    body?: { contentType?: string; content?: string };
    bodyPreview?: string;
    hasAttachments?: boolean;
    internetMessageId?: string;
};

export type GraphListResponse<T> = {
    value: T[];
    "@odata.nextLink"?: string;
    "@odata.deltaLink"?: string;
};

export type GraphAttachmentListItem = {
    id: string;
    name: string;
    contentType?: string;
    size?: number;
};

export type GraphAttachment = {
    id: string;
    name: string;
    contentType: string;
    contentBytes?: string;
};

const tenantId = required("GRAPH_TENANT_ID");
const clientId = required("GRAPH_CLIENT_ID");
const clientSecret = required("GRAPH_CLIENT_SECRET");

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

async function getAccessToken(): Promise<string> {
    const scope = "https://graph.microsoft.com/.default";
    const token = await credential.getToken(scope);
    if (!token?.token) throw new Error("Failed to acquire Graph access token");
    return token.token;
}

export async function graphClient() {
    const token = await getAccessToken();
    return Client.init({
        authProvider: (done) => done(null, token),
    });
}

function toRecipients(addresses: string[] | undefined): GraphRecipient[] | undefined {
    if (!addresses?.length) return undefined;

    const out: GraphRecipient[] = [];
    for (const v of addresses) {
        const a = v.trim();
        if (!a) continue;
        out.push({ emailAddress: { address: a } });
    }
    return out.length ? out : undefined;
}


export async function listInboxMessages(sharedInboxUpn: string, top = 5): Promise<GraphListResponse<GraphMessage>> {
    const g = await graphClient();
    return g
        .api(`/users/${encodeURIComponent(sharedInboxUpn)}/mailFolders/Inbox/messages`)
        .top(top)
        .select("id,subject,conversationId,receivedDateTime,from,hasAttachments,bodyPreview")
        .orderby("receivedDateTime desc")
        .get();
}

export async function getMessage(sharedInboxUpn: string, messageId: string): Promise<GraphMessage> {
    const g = await graphClient();
    return g
        .api(`/users/${encodeURIComponent(sharedInboxUpn)}/messages/${messageId}`)
        .select(
            "id,subject,conversationId,receivedDateTime,sentDateTime,from,toRecipients,ccRecipients,body,bodyPreview,hasAttachments,internetMessageId"
        )
        .get();
}

export async function listConversationMessages(
    sharedInboxUpn: string,
    conversationId: string,
    top = 50
): Promise<GraphListResponse<GraphMessage>> {
    const g = await graphClient();
    return g
        .api(`/users/${encodeURIComponent(sharedInboxUpn)}/messages`)
        .filter(`conversationId eq '${conversationId}'`)
        .top(top)
        .select("id,subject,conversationId,receivedDateTime,from,toRecipients,ccRecipients,bodyPreview,hasAttachments")
        .orderby("receivedDateTime asc")
        .get();
}

export async function createReplyDraft(
    sharedInboxUpn: string,
    messageId: string,
    commentHtml: string
): Promise<GraphMessage> {
    const g = await graphClient();
    const draft = (await g
        .api(`/users/${encodeURIComponent(sharedInboxUpn)}/messages/${messageId}/createReply`)
        .post({})) as GraphMessage;

    const draftId = draft?.id;
    if (!draftId) return draft;

    await g.api(`/users/${encodeURIComponent(sharedInboxUpn)}/messages/${draftId}`).patch({
        body: { contentType: "HTML", content: commentHtml },
    });

    return { ...draft, id: draftId };
}

/**
 * Fallback: create a NEW draft message (not a reply) if createReplyDraft fails
 * (meeting request / eventMessage / etc.).
 */
export async function createNewMessageDraft(sharedInboxUpn: string, args: {
    subject: string;
    bodyHtml: string;
    to: string[];
    cc?: string[];
}): Promise<GraphMessage> {
    const g = await graphClient();

    const to = toRecipients(args.to) ?? [];
    const cc = toRecipients(args.cc ?? []) ?? [];

    const draft = (await g.api(`/users/${encodeURIComponent(sharedInboxUpn)}/messages`).post({
        subject: args.subject,
        body: { contentType: "HTML", content: args.bodyHtml },
        toRecipients: to,
        ...(cc.length ? { ccRecipients: cc } : {}),
    })) as GraphMessage;

    return draft;
}

export async function deltaInboxMessages(
    sharedInboxUpn: string,
    deltaLink?: string | null
): Promise<GraphListResponse<GraphMessage>> {
    const g = await graphClient();

    const url = deltaLink
        ? deltaLink
        : `/users/${encodeURIComponent(sharedInboxUpn)}/mailFolders/Inbox/messages/delta?$select=id,subject,conversationId,receivedDateTime,from,hasAttachments,bodyPreview,internetMessageId`;

    return g.api(url).get();
}

export async function listMessageAttachments(
    sharedInboxUpn: string,
    messageId: string
): Promise<GraphListResponse<GraphAttachmentListItem>> {
    const g = await graphClient();
    return g
        .api(`/users/${encodeURIComponent(sharedInboxUpn)}/messages/${messageId}/attachments`)
        .select("id,name,contentType,size")
        .get();
}

export async function patchDraft(
    sharedInboxUpn: string,
    draftMessageId: string,
    patch: {
        subject?: string;
        bodyHtml?: string;
        to?: string[];
        cc?: string[];
    }
) {
    const g = await graphClient();

    const to = patch.to ? toRecipients(patch.to) : undefined;
    const cc = patch.cc ? toRecipients(patch.cc) : undefined;

    return g.api(`/users/${encodeURIComponent(sharedInboxUpn)}/messages/${draftMessageId}`).patch({
        ...(patch.subject ? { subject: patch.subject } : {}),
        ...(patch.bodyHtml ? { body: { contentType: "HTML", content: patch.bodyHtml } } : {}),
        ...(to ? { toRecipients: to } : {}),
        ...(cc ? { ccRecipients: cc } : {}),
    });
}

export async function downloadAttachmentContent(
    sharedInboxUpn: string,
    messageId: string,
    attachmentId: string
): Promise<{ name: string; contentType: string; bytes: Buffer }> {
    const g = await graphClient();

    const att = (await g
        .api(`/users/${encodeURIComponent(sharedInboxUpn)}/messages/${messageId}/attachments/${attachmentId}`)
        .get()) as GraphAttachment;

    const contentBytes = att?.contentBytes;
    if (!contentBytes) {
        throw new Error("Attachment has no contentBytes (not a fileAttachment?)");
    }

    return {
        name: att.name,
        contentType: att.contentType,
        bytes: Buffer.from(contentBytes, "base64"),
    };
}

export async function fetchDeltaAll(
    sharedInboxUpn: string,
    deltaLink?: string | null
): Promise<{ items: GraphMessage[]; deltaLink: string | null }> {
    const items: GraphMessage[] = [];
    let page = await deltaInboxMessages(sharedInboxUpn, deltaLink ?? null);

    while (true) {
        items.push(...(page.value ?? []));
        const next = page["@odata.nextLink"];
        if (next) {
            page = await deltaInboxMessages(sharedInboxUpn, next);
            continue;
        }
        const finalDelta = page["@odata.deltaLink"] ?? null;
        return { items, deltaLink: finalDelta };
    }
}

export async function deltaInboxMessagesFrom(
    sharedInboxUpn: string,
    fromIso: string
): Promise<GraphListResponse<GraphMessage>> {
    const g = await graphClient();

    // Limit initial sync window only (when no delta cursor yet)
    const url =
        `/users/${encodeURIComponent(sharedInboxUpn)}/mailFolders/Inbox/messages/delta` +
        `?$select=id,subject,conversationId,receivedDateTime,from,hasAttachments,bodyPreview,internetMessageId` +
        `&$filter=receivedDateTime ge ${fromIso}`;

    return g.api(url).get();
}

export async function fetchDeltaAllFrom(
    sharedInboxUpn: string,
    fromIso: string
): Promise<{ items: GraphMessage[]; deltaLink: string | null }> {
    const items: GraphMessage[] = [];
    let page = await deltaInboxMessagesFrom(sharedInboxUpn, fromIso);

    while (true) {
        items.push(...(page.value ?? []));
        const next = page["@odata.nextLink"];
        if (next) {
            page = await deltaInboxMessages(sharedInboxUpn, next);
            continue;
        }
        const finalDelta = page["@odata.deltaLink"] ?? null;
        return { items, deltaLink: finalDelta };
    }
}

export async function sendDraft(sharedInboxUpn: string, draftMessageId: string): Promise<void> {
    const g = await graphClient();
    await g.api(`/users/${encodeURIComponent(sharedInboxUpn)}/messages/${draftMessageId}/send`).post({});
}

