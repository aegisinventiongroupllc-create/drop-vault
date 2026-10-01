export type ImageConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
};

export async function editImage(config: ImageConfig, form: FormData) {
  const streaming = form.get("stream") !== "false";
  form.set("model", config.model);
  form.set("size", "1024x1024");
  form.set("quality", "max");
  form.set("output_format", "webp");
  if (streaming) {
    form.set("stream", "true");
    form.set("partial_images", "1");
  } else {
    form.delete("stream");
    form.delete("partial_images");
  }

  return fetch(`${config.baseURL.replace(/\/+$/, "")}/v1/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: form,
  });
}