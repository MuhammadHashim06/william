import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Step 5 design:
 * - PDFs: upload -> input_file
 * - Images (jpg/png/webp): send as input_image (data URL), DO NOT upload
 * - docx/xlsx/csv: extract to text locally and include as input_text
 */
const MODEL_INLINE = process.env.OPENAI_MODEL_INLINE ?? "gpt-5.2";
const MODEL_DRAFT = process.env.OPENAI_MODEL_DRAFT ?? "gpt-5.2";

export type UploadFile = {
    name: string;
    bytes: Buffer;
    contentType?: string;
};

export type InlineImage = {
    name: string;
    contentType: string; // e.g. image/png
    dataUrl: string; // data:<mime>;base64,<...>
};

export type InlineTextAttachment = {
    name: string;
    contentType?: string;
    text: string;
};

type ResponsesLike = {
    output_text?: string;
};

function bufferToDataUrl(buf: Buffer, contentType: string): string {
    const b64 = buf.toString("base64");
    return `data:${contentType};base64,${b64}`;
}

/**
 * OpenAI Files API upload:
 * IMPORTANT: only use for formats the Files+Responses "input_file" accepts reliably.
 * In our pipeline we only upload PDFs.
 */
async function uploadUserDataFile(file: UploadFile): Promise<string> {
    const contentType = file.contentType ?? "application/octet-stream";

    // Buffer -> Uint8Array (valid BlobPart)
    const bytes = new Uint8Array(file.bytes);

    const created = await client.files.create({
        file: new File([bytes], file.name, { type: contentType }),
        purpose: "user_data",
    });

    return created.id;
}

type ResponseInputTextPart = { type: "input_text"; text: string };
type ResponseInputFilePart = { type: "input_file"; file_id: string };

// FIX: include `detail`
type ResponseInputImagePart = {
    type: "input_image";
    image_url: string;                // data URL is OK
    detail: "auto" | "low" | "high";  // REQUIRED by SDK types
};

type ResponseUserContentPart =
    | ResponseInputTextPart
    | ResponseInputFilePart
    | ResponseInputImagePart;


async function responsesJson<T>(args: {
    model?: string;
    system: string;
    userText: string;
    pdfFileIds: string[];
    images: InlineImage[];
    attachmentTexts: InlineTextAttachment[];
}): Promise<T> {
    const pdfParts: ResponseInputFilePart[] = args.pdfFileIds.map((id) => ({
        type: "input_file",
        file_id: id,
    }));

    const imageParts: ResponseInputImagePart[] = args.images.map((img) => ({
        type: "input_image",
        image_url: img.dataUrl,
        detail: "auto",
    }));

    const textParts: ResponseInputTextPart[] = args.attachmentTexts.map((t) => ({
        type: "input_text",
        text:
            `\n\n[ATTACHMENT_TEXT_BEGIN]\n` +
            `name: ${t.name}\n` +
            `contentType: ${t.contentType ?? "unknown"}\n` +
            `text:\n${t.text}\n` +
            `[ATTACHMENT_TEXT_END]\n`,
    }));

    const userContent: ResponseUserContentPart[] = [
        { type: "input_text", text: args.userText },
        ...textParts,
        ...pdfParts,
        ...imageParts,
    ];

    const resp = await client.responses.create({
        model: args.model ?? MODEL_INLINE,
        tools: [{ type: "code_interpreter", container: { type: "auto" } }],
        input: [
            {
                role: "system",
                content: [{ type: "input_text", text: args.system }],
            },
            {
                role: "user",
                content: userContent,
            },
        ],
    });

    const out = (resp as unknown as ResponsesLike).output_text;
    if (!out) throw new Error("OpenAI Responses API returned empty output_text");
    return JSON.parse(out) as T;
}

async function chatJson<T>(args: { model: string; system: string; user: string }): Promise<T> {
    const res = await client.chat.completions.create({
        model: args.model,
        temperature: 0,
        messages: [
            { role: "system", content: args.system },
            { role: "user", content: args.user },
        ],
        response_format: { type: "json_object" },
    });

    const content = res.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty content");
    return JSON.parse(content) as T;
}

export const openai = {
    /**
     * Step 5: Inline extraction + classification in ONE call.
     *
     * - PDFs uploaded -> input_file
     * - Images passed as input_image (data URLs)
     * - docx/xlsx/csv passed as extracted text blocks
     */
    async classifyInline<T>(p: {
        system: string;
        user: string;
        pdfFiles: UploadFile[];
        images: InlineImage[];
        attachmentTexts: InlineTextAttachment[];
    }): Promise<T> {
        const pdfFileIds: string[] = [];
        for (const f of p.pdfFiles) {
            const id = await uploadUserDataFile(f);
            pdfFileIds.push(id);
        }

        return responsesJson<T>({
            system: p.system,
            userText: p.user,
            pdfFileIds,
            images: p.images,
            attachmentTexts: p.attachmentTexts,
        });
    },

    /**
     * Draft generation uses already-saved extractedJson, so no file inputs needed.
     */
    draft<T>(p: { system: string; user: string }): Promise<T> {
        return chatJson<T>({
            model: MODEL_DRAFT,
            system: p.system,
            user: p.user,
        });
    },

    // exported for reuse if needed
    bufferToDataUrl,
};
