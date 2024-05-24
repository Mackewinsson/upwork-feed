require("dotenv").config();
let Parser = require("rss-parser");
let parser = new Parser();
const sendToSlack = require("../slack/sendToSlack");

let latestItemTimestamp = 0; // Initialize to 0 to fetch the latest item on first run
let backoffTime = 300000; // 5 minutes
let maxBackoffTime = 3600000; // 1 hour

async function initializeLatestItemTimestamp(rssUrl) {
  try {
    const feed = await parser.parseURL(rssUrl);
    if (feed && feed.items && feed.items.length > 0) {
      // Set latestItemTimestamp to the most recent item in the feed
      latestItemTimestamp = new Date(feed.items[0].pubDate).getTime();
      console.log("Initialized latestItemTimestamp to", latestItemTimestamp);
    } else {
      console.log("No items found in the RSS feed during initialization.");
    }
  } catch (error) {
    console.error("Error initializing latest item timestamp:", error);
  }
}

async function checkRSSFeed() {
  const rssUrl = process.env.RSS_URL;
  console.log("RSS URL:", rssUrl);

  try {
    console.log("Fetching RSS feed...");
    const feed = await parser.parseURL(rssUrl);

    if (!feed || !feed.items || feed.items.length === 0) {
      console.log("No items found in the RSS feed.");
      return;
    }

    let newLatestTimestamp = latestItemTimestamp;

    feed.items.forEach((item) => {
      const itemTimestamp = new Date(item.pubDate).getTime();
      if (itemTimestamp > latestItemTimestamp) {
        newLatestTimestamp = Math.max(newLatestTimestamp, itemTimestamp);
        console.log("New item found:", item);
        sendToSlack(item);
      }
    });

    if (newLatestTimestamp > latestItemTimestamp) {
      latestItemTimestamp = newLatestTimestamp;
      console.log("Updated latestItemTimestamp to", newLatestTimestamp);
    }

    backoffTime = 300000; // Reset backoff to 5 minutes after a successful fetch
  } catch (error) {
    if (error.statusCode === 429) {
      console.error("Rate limit exceeded, backing off...");
      backoffTime = Math.min(backoffTime * 2, maxBackoffTime); // Exponential backoff
    } else {
      console.error("Error fetching RSS feed:", error);
    }
  } finally {
    console.log("Next fetch in", backoffTime / 60000, "minutes.");
    setTimeout(checkRSSFeed, backoffTime);
  }
}

module.exports = checkRSSFeed;

// Initialize the latestItemTimestamp and start the first execution of the script
const rssUrl = process.env.RSS_URL;

initializeLatestItemTimestamp(rssUrl).then(() => {
  checkRSSFeed();
});
