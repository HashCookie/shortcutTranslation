const axios = require("axios");
const crypto = require("crypto");

// 有道 API 配置
const YOUDAO_API_URL = "https://openapi.youdao.com/api";
const APP_KEY = process.env.YOUDAO_APP_KEY; // 从环境变量读取 AppKey
const APP_SECRET = process.env.YOUDAO_APP_SECRET; // 从环境变量读取 AppSecret

// 生成签名方法
function generateSign(text, salt) {
  const str = APP_KEY + text + salt + APP_SECRET;
  return crypto.createHash("md5").update(str).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { text, targetLanguage } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing 'text' parameter" });
  }

  const salt = Date.now();
  const sign = generateSign(text, salt);

  const params = {
    q: text,
    from: "auto",
    to: targetLanguage || "en", // 默认翻译成英文
    appKey: APP_KEY,
    salt,
    sign,
  };

  try {
    const response = await axios.get(YOUDAO_API_URL, { params });
    if (response.data && response.data.translation) {
      res.status(200).json({ translatedText: response.data.translation[0] });
    } else {
      res.status(500).json({ error: "Translation failed", details: response.data });
    }
  } catch (error) {
    res.status(500).json({ error: "Request to Youdao API failed", details: error.message });
  }
}