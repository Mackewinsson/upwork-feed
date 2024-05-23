let Parser = require("rss-parser");
let parser = new Parser();
const sendToSlack = require("../slack/sendToSlack");

let latestItemTimestamp = new Date().getTime();
let backoffTime = 300000; // 5 minutos
let maxBackoffTime = 3600000; // 1 hora

async function checkRSSFeed() {
  const rssUrl =
    "https://www.upwork.com/ab/feed/jobs/rss?amount=1000-4999%2C5000-&paging=NaN-undefined&q=(React%20AND%20native)%20AND%20title%3A(React%20native)&sort=recency&t=1&api_params=1&securityToken=1cd2f0b713036ae11e7d1bcaf2bc5df5d81d4c3121fff4f09e52f672dadd0fbd08eccbde8d96736b61f97ed4920f61b358b3350b4ce7ddf09b2ad0a893741864&userUid=1200830121054793728&orgUid=1200830121067376641";
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
