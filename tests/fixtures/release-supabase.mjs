// An in-memory HTTP simulator, not a Supabase database. It has no upstream client.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const cities = [
  {
    id: "be0e668d-75fe-4249-8f09-dd9910f91bd0",
    name_ar: "الرياض",
    name_en: "Riyadh",
    region_ar: "الرياض",
    region_en: "Riyadh",
    slug: "riyadh",
  },
  {
    id: "b8b8d8d6-9ec4-4c15-b45c-825fa895ab21",
    name_ar: "جدة",
    name_en: "Jeddah",
    region_ar: "مكة",
    region_en: "Makkah",
    slug: "jeddah",
  },
];
const services = [
  {
    id: "018a0600-3fb9-45e7-bea4-3e7390d1e730",
    service_key: "furniture_moving",
    name_ar: "نقل الأثاث",
    name_en: "Furniture moving",
    description_ar: "خدمة اختبار محلية",
    description_en: "Local test service",
    transport_scope: "both",
  },
];
const uploads = new Map();
const submissions = [];
let rejectUploads = false;
let removedUploads = 0;

const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3107");
  response.setHeader("Access-Control-Allow-Headers", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }
  const url = new URL(request.url, "http://127.0.0.1:54329");
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const json = () => (bytes.length ? JSON.parse(bytes.toString()) : {});
  const send = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };
  try {
    if (url.pathname === "/__health") return send({ localFixture: true });
    if (url.pathname === "/__state")
      return send({ submissions, uploads: uploads.size, removedUploads });
    if (url.pathname === "/__reset") {
      uploads.clear();
      submissions.length = 0;
      removedUploads = 0;
      rejectUploads = Boolean(json().rejectUploads);
      return send({ ok: true });
    }
    if (url.pathname === "/rest/v1/cities") return send(cities);
    if (url.pathname === "/rest/v1/services") return send(services);
    if (url.pathname === "/rest/v1/service_options") return send([]);
    if (url.pathname === "/rest/v1/leads") return send([]);
    if (url.pathname === "/rest/v1/rpc/get_public_business_settings") return send({});
    if (url.pathname === "/rest/v1/rpc/get_public_homepage_content")
      return send({ cities: [], reviews: [] });
    if (url.pathname === "/rest/v1/rpc/get_indexable_city_seo_index") return send([]);
    if (url.pathname === "/rest/v1/rpc/submit_guest_service_request") {
      assert.equal(request.headers.apikey, "sb_secret_release_fixture");
      const payload = json();
      for (const attachment of payload.attachment_payload) {
        const uploaded = uploads.get(attachment.storage_path);
        assert.ok(uploaded, "attachment must have reached storage");
        assert.equal(attachment.size_bytes, uploaded.bytes.length);
        assert.equal(attachment.mime_type, uploaded.contentType);
        assert.equal(
          attachment.checksum_sha256,
          createHash("sha256").update(uploaded.bytes).digest("hex"),
        );
      }
      submissions.push(payload);
      return send([{ reference_number: "NQ-261101-000001" }]);
    }
    const signed = "/storage/v1/object/upload/sign/attachments/";
    if (url.pathname.startsWith(signed)) {
      const path = decodeURIComponent(url.pathname.slice(signed.length));
      if (request.method === "POST")
        return send({ url: `/object/upload/sign/attachments/${path}?token=fixture-token` });
      if (request.method === "PUT") {
        assert.equal(url.searchParams.get("token"), "fixture-token");
        // Supabase's browser client uploads a multipart body containing the File.
        const multipart = new Response(bytes, {
          headers: { "Content-Type": request.headers["content-type"] },
        });
        const form = await multipart.formData();
        const file = [...form.values()].find((value) => typeof value !== "string");
        assert.ok(file);
        uploads.set(path, { bytes: Buffer.from(await file.arrayBuffer()), contentType: file.type });
        return send({ Key: `attachments/${path}` });
      }
    }
    const info = "/storage/v1/object/info/attachments/";
    if (url.pathname.startsWith(info)) {
      const uploaded = uploads.get(decodeURIComponent(url.pathname.slice(info.length)));
      if (!uploaded) return send({ message: "not found" }, 404);
      return send({
        size: uploaded.bytes.length + (rejectUploads ? 1 : 0),
        content_type: uploaded.contentType,
        bucket_id: "attachments",
      });
    }
    if (url.pathname === "/storage/v1/object/attachments" && request.method === "DELETE") {
      for (const path of json().prefixes ?? []) {
        if (uploads.delete(path)) removedUploads++;
      }
      return send([]);
    }
    return send({ message: `Unexpected fixture endpoint: ${request.method} ${url.pathname}` }, 404);
  } catch (error) {
    console.error("Local release fixture assertion failed:", error.message);
    return send({ message: "fixture assertion failed" }, 500);
  }
});
server.listen(54329, "127.0.0.1", () =>
  console.log("Release Supabase simulator: localhost only; no upstream"),
);
