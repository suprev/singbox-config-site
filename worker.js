// Cloudflare Worker：将 GitHub RAW 的 config.json 反向代理出来
// 把 GITHUB_URL 改成你的 RAW 地址（已为你填好）
const GITHUB_URL = "https://raw.githubusercontent.com/suprev/singbox-1.12/refs/heads/main/config.json";

async function fetchConfig() {
  // 使用 no-cache 让 Cloudflare 与浏览器优先走条件校验（尊重 GitHub ETag）
  const upstream = await fetch(GITHUB_URL, { headers: { "cache-control": "no-cache" } });
  const text = await upstream.text();
  return { ok: upstream.ok, status: upstream.status, text };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    // 统一处理 / 、/config 、/config.json 返回 JSON
    if (url.pathname === "/" || url.pathname === "/config" || url.pathname === "/config.json") {
      try {
        const { ok, status, text } = await fetchConfig();
        if (!ok) {
          return new Response(JSON.stringify({ error: "upstream_error", status }), {
            status: 502,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "access-control-allow-origin": "*",
            },
          });
        }
        return new Response(text, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
            // 边缘缓存 60 秒（可按需调整）
            "cache-control": "public, max-age=60",
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "fetch_failed" }), {
          status: 502,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
          },
        });
      }
    }

    // /download 返回下载附件
    if (url.pathname === "/download") {
      try {
        const { ok, status, text } = await fetchConfig();
        if (!ok) {
          return new Response(JSON.stringify({ error: "upstream_error", status }), {
            status: 502,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "access-control-allow-origin": "*",
            },
          });
        }
        return new Response(text, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
            "content-disposition": 'attachment; filename="config.json"',
            "cache-control": "public, max-age=60",
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "fetch_failed" }), {
          status: 502,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
          },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
