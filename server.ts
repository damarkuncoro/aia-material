import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route: Scrape images from a URL or sequence
  app.post("/api/scrape", async (req, res) => {
    const { url, mode = "auto" } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      let targetUrl = url;
      let sequenceMatch = targetUrl.match(/^(.*\/)(\d+)(\.[a-zA-Z0-9]+)$/);
      
      // Smart probing for IAI Global modules if it's a directory-like URL
      if (!sequenceMatch && mode === "auto" && url.includes("iaiglobal.or.id")) {
        const normalizedUrl = url.endsWith("/") ? url : url + "/";
        const probePath = `${normalizedUrl}files/mobile/1.jpg`;
        try {
          const probe = await axios.get(probePath, { timeout: 3000 });
          if (probe.status === 200) {
            targetUrl = probePath;
            sequenceMatch = targetUrl.match(/^(.*\/)(\d+)(\.[a-zA-Z0-9]+)$/);
          }
        } catch (e) {
          // Probe failed, continue with original URL
        }
      }

      if (mode === "sequence" || (mode === "auto" && sequenceMatch)) {
        const [_, baseUrl, startNumStr, extension] = sequenceMatch || [null, targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1), "1", targetUrl.substring(targetUrl.lastIndexOf('.'))];
        const startNum = parseInt(startNumStr || "1");
        const images: string[] = [];
        
        // Try to fetch up to 500 images in sequence
        // We do this in chunks to be faster but respectful
        let currentNum = startNum;
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 3; // Stop after 3 404s

        while (consecutiveFailures < maxConsecutiveFailures && currentNum < startNum + 500) {
          const targetUrl = `${baseUrl}${currentNum}${extension}`;
          try {
            // Use HEAD request first to check existence if possible, but GET is safer for some servers
            const check = await axios.get(targetUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              },
              timeout: 5000,
            });
            
            if (check.status === 200) {
              images.push(targetUrl);
              consecutiveFailures = 0;
            } else {
              consecutiveFailures++;
            }
          } catch (e) {
            consecutiveFailures++;
          }
          currentNum++;
        }

        return res.json({ images, mode: "sequence" });
      }

      // Default: Page scraping
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      const $ = cheerio.load(response.data);
      const images: string[] = [];

      // Target common image patterns in IAI Global or general pages
      $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
        if (src) {
          try {
            const absoluteUrl = new URL(src, url).href;
            if (!images.includes(absoluteUrl) && !absoluteUrl.startsWith("data:")) {
              images.push(absoluteUrl);
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }
      });

      // Also look for links that might be images
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        if (href && (href.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
          try {
            const absoluteUrl = new URL(href, url).href;
            if (!images.includes(absoluteUrl)) {
              images.push(absoluteUrl);
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }
      });

      res.json({ images, mode: "page" });
    } catch (error: any) {
      console.error("Scraping error:", error.message);
      res.status(500).json({ error: "Failed to scrape URL: " + error.message });
    }
  });

  // API Route: Proxy image to bypass CORS
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("Image URL is required");
    }

    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Referer": new URL(imageUrl).origin,
        },
      });

      const contentType = response.headers["content-type"];
      res.setHeader("Content-Type", contentType || "image/jpeg");
      res.send(response.data);
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(500).send("Failed to fetch image");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
