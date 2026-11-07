
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

const store = getStore({
  name: "shekapoi-videos",
  consistency: "strong"
});

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

export default async (req) => {
  if (req.method === "GET") {
    const { blobs } = await store.list({
      prefix: "meta-"
    });

    const videos = [];

    for (const item of blobs) {
      const meta = await store.get(item.key, {
        type: "json"
      });
      if (meta) videos.push(meta);
    }

    videos.sort((a, b) => b.createdAt - a.createdAt);
    return json({ videos });
  }

  if (req.method !== "POST") {
    return json({ error: "Metode tidak didukung." }, 405);
  }

  try {
    const form = await req.formData();
    const file = form.get("video");
    const creator = String(form.get("creator") || "Kreator").trim().slice(0, 30);
    const caption = String(form.get("caption") || "").trim().slice(0, 180);

    if (!(file instanceof File) || !file.type.startsWith("video/")) {
      return json({ error: "File video tidak valid." }, 400);
    }

    if (file.size > 4 * 1024 * 1024) {
      return json({ error: "Maksimal ukuran video 4 MB." }, 413);
    }

    const allowed = [
      "video/mp4",
      "video/webm",
      "video/quicktime"
    ];

    if (!allowed.includes(file.type)) {
      return json({ error: "Format video tidak didukung." }, 400);
    }

    const id = randomUUID();
    const ext = file.type === "video/webm" ? "webm" :
      file.type === "video/quicktime" ? "mov" : "mp4";

    await store.set(`file-${id}.${ext}`, file);

    const metadata = {
      id,
      creator: creator || "Kreator",
      caption,
      createdAt: Date.now(),
      type: file.type
    };

    await store.set(`meta-${id}`, JSON.stringify(metadata));

    return json({ ok: true, video: metadata }, 201);
  } catch (error) {
    console.error(error);
    return json({ error: "Gagal menyimpan video." }, 500);
  }
};
