import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  watermark: vi.fn(),
  upload: vi.fn(),
  activity: vi.fn(),
}));
vi.mock("@/lib/mediaWatermark", () => ({ watermarkCreatorMedia: mocks.watermark }));
vi.mock("@/lib/activityLog", () => ({ logActivity: mocks.activity }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({
    upload: mocks.upload,
    getPublicUrl: () => ({ data: { publicUrl: "https://example.test/branded" } }),
  }) } },
}));

import { uploadMedia } from "@/lib/storageUpload";

describe("permanent creator watermark uploads", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.upload.mockResolvedValue({ error: null }); });

  it("stores only the processed video with the correct extension and type", async () => {
    const original = new File(["original"], "clip.mov", { type: "video/quicktime" });
    const branded = new File(["DTT frames"], "clip-dtt.mp4", { type: "video/mp4" });
    mocks.watermark.mockResolvedValue(branded);
    const result = await uploadMedia(original, "vault", "creator");
    expect(result).toHaveProperty("path", expect.stringMatching(/^creator\/.*\.mp4$/));
    expect(mocks.upload).toHaveBeenCalledWith(expect.any(String), branded, expect.objectContaining({ contentType: "video/mp4",upsert:false }));
  });

  it("never uploads an unmarked file if watermarking fails", async () => {
    mocks.watermark.mockRejectedValue(new Error("Watermark failed"));
    const result = await uploadMedia(new File(["original"], "photo.jpg", { type: "image/jpeg" }), "teasers", "creator");
    expect(result).toEqual({ error: "Watermark failed" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('reports storage failure without returning a false success',async()=>{
    mocks.watermark.mockResolvedValue(new File(['DTT'],'photo-dtt.jpg',{type:'image/jpeg'}));
    mocks.upload.mockResolvedValue({error:{message:'Upload denied'}});
    expect(await uploadMedia(new File(['original'],'photo.jpg'),'vault','creator')).toEqual({error:'Upload denied'});
  });
  it('does not expose a public URL for a private object',async()=>{
    mocks.watermark.mockResolvedValue(new File(['DTT'],'photo-dtt.jpg',{type:'image/jpeg'}));
    expect(await uploadMedia(new File(['original'],'photo.jpg'),'vault','creator')).not.toHaveProperty('url');
  });
});