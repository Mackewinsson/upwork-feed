require("dotenv").config();
let Parser = require("rss-parser");
let parser = new Parser();
const sendToSlack = require("../slack/sendToSlack");

let latestItemTimestamp = new Date().getTime();
let backoffTime = 300000; // 5 minutos
let maxBackoffTime = 3600000; // 1 hora

async function checkRSSFeed() {
  const rssUrl = process.env.RSS_URL;
  try {
    console.log("fetching");
    const feed = await parser.parseURL(rssUrl);
    let newLatestTimestamp = latestItemTimestamp;

    feed.items.forEach((item) => {
      const itemTimestamp = new Date(item.pubDate).getTime();
      if (itemTimestamp > latestItemTimestamp) {
        newLatestTimestamp = Math.max(newLatestTimestamp, itemTimestamp);
        sendToSlack(item);
      }
    });

    latestItemTimestamp = newLatestTimestamp;
    backoffTime = 300000; // Restablecer el backoff a 5 minutos después de un fetch exitoso
  } catch (error) {
    if (error.statusCode === 429) {
      console.error("Rate limit exceeded, backing off...");
      backoffTime = Math.min(backoffTime * 2, maxBackoffTime); // Incrementar el backoff de forma exponencial hasta un máximo
    } else {
      console.error("Error fetching RSS feed:", error);
    }
  } finally {
    setTimeout(checkRSSFeed, backoffTime);
  }
}

module.exports = checkRSSFeed;

// Inicia la primera ejecución del script
checkRSSFeed();
