
import { getStore } from "@netlify/blobs";

const store = getStore({
  name: "shekapoi-videos",
  consistency: "strong"
});

export default async (req) => {
  const id = new URL(req.url).searchParams.get("id") || "";

  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    return new Response("ID tidak valid", { status: 400 });
  }

  const { blobs } = await store.list({
    prefix: `file-${id}.`
  });

  const item = blobs[0];

  if (!item) {
    return new Response("Video tidak ditemukan", {
      status: 404
    });
  }

  const data = await store.get(item.key, {
    type: "arrayBuffer"
  });

  if (!data) {
    return new Response("Video tidak ditemukan", {
      status: 404
    });
  }

  const ext = item.key.split(".").pop();

  const mime = ext === "webm"
    ? "video/webm"
    : ext === "mov"
    ? "video/quicktime"
    : "video/mp4";

  return new Response(data, {
    headers: {
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=60"
    }
  });
};
