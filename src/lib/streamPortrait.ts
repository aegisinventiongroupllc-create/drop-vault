import { createParser } from "eventsource-parser";

type ImagePayload = { type?: string; b64_json?: string; error?: { message?: string } };

const copyForm = (source: FormData, stream: boolean) => {
  const form = new FormData();
  source.forEach((value, name) => form.append(name, value));
  form.set("stream", String(stream));
  return form;
};

export async function streamPortrait(
  endpoint: string,
  input: FormData,
  headers: HeadersInit,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
) {
  const send = (stream: boolean) => fetch(endpoint, { method: "POST", headers, body: copyForm(input, stream) });
  const response = await send(true);
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    let message = body;
    try { message = (JSON.parse(body) as { error?: string }).error ?? body; } catch { /* use text */ }
    throw new Error(message || `Portrait creation failed (${response.status}).`);
  }

  let sawEvent = false;
  let completed = false;
  let streamError: string | undefined;
  const parser = createParser({
    onEvent(event) {
      let payload: ImagePayload | undefined;
      try { payload = JSON.parse(event.data) as ImagePayload; } catch { return; }
      const type = event.event || payload.type;
      if (type === "error" || payload.type === "error") {
        sawEvent = true;
        streamError = payload.error?.message ?? "Portrait creation failed.";
        return;
      }
      if (type !== "image_edit.partial_image" && type !== "image_edit.completed" && type !== "image_generation.partial_image" && type !== "image_generation.completed") return;
      sawEvent = true;
      if (!payload.b64_json) return;
      const isFinal = type.endsWith(".completed");
      onFrame(`data:image/webp;base64,${payload.b64_json}`, isFinal);
      if (isFinal) completed = true;
    },
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      parser.feed(chunk.value);
    }
  } catch (error) {
    if (sawEvent) throw error;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  if (streamError) throw new Error(streamError);
  if (completed) return;
  if (sawEvent) throw new Error("Portrait creation stopped before the final image was ready.");

  const replay = await send(false);
  if (!replay.ok) {
    const body = await replay.text().catch(() => "");
    throw new Error(body || `Portrait creation failed (${replay.status}).`);
  }
  const payload = await replay.json() as { data?: Array<{ b64_json?: string }> };
  const image = payload.data?.[0]?.b64_json;
  if (!image) throw new Error("Portrait creation returned no image.");
  onFrame(`data:image/webp;base64,${image}`, true);
}