const axios = require("axios");
const crypto = require("crypto");

const YOUDAO_API_URL = "https://openapi.youdao.com/api";
const APP_KEY = process.env.YOUDAO_APP_KEY;
const APP_SECRET = process.env.YOUDAO_APP_SECRET;

// 添加环境变量检查
if (!APP_KEY || !APP_SECRET) {
  throw new Error('Missing required environment variables: ' + 
    (!APP_KEY ? 'YOUDAO_APP_KEY ' : '') + 
    (!APP_SECRET ? 'YOUDAO_APP_SECRET' : '')
  );
}

function generateSign(q, salt, curtime) {
  let input = '';
  if (q.length <= 20) {
    input = q;
  } else {
    const front = q.substring(0, 10);
    const end = q.substring(q.length - 10);
    input = `${front}${q.length}${end}`;
  }
  
  const str = APP_KEY + input + salt + curtime + APP_SECRET;
  return crypto.createHash("sha256").update(str).digest("hex");
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const { text, targetLanguage } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing 'text' parameter" });
    }

    const curtime = Math.round(new Date().getTime() / 1000).toString();
    const salt = crypto.randomUUID();
    const sign = generateSign(text, salt, curtime);

    const params = new URLSearchParams({
      q: text,
      from: "auto",
      to: targetLanguage || "en",
      appKey: APP_KEY,
      salt: salt,
      sign: sign,
      signType: "v3",
      curtime: curtime
    });

    const response = await axios.post(YOUDAO_API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.data.errorCode === "0") {
      return res.status(200).json({ 
        translatedText: response.data.translation[0],
        sourceLanguage: response.data.l.split('2')[0],
        targetLanguage: response.data.l.split('2')[1],
        pronunciation: {
          source: response.data.speakUrl,
          target: response.data.tSpeakUrl
        },
        raw: response.data
      });
    } else {
      return res.status(400).json({ 
        error: "Translation failed", 
        errorCode: response.data.errorCode,
        details: response.data 
      });
    }
  } catch (error) {
    // 详细的错误日志
    console.error('Translation error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      config: {
        url: error.config?.url,
        params: error.config?.params,
        headers: error.config?.headers
      }
    });

    return res.status(500).json({ 
      error: "Request to Youdao API failed", 
      message: error.message,
      details: error.response?.data || error.message,
      env: {
        hasAppKey: !!APP_KEY,
        hasAppSecret: !!APP_SECRET
      }
    });
  }
};