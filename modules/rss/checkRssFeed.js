require("dotenv").config();
let Parser = require("rss-parser");
let parser = new Parser();
const sendToSlack = require("../slack/sendToSlack");

let latestItemTimestamp = 0; // Initialize to 0 to fetch the latest item on first run
let backoffTime = 300000; // 5 minutes
let maxBackoffTime = 3600000; // 1 hour

async function initializeLatestItemTimestamp(rssUrl, name) {
  try {
    const feed = await parser.parseURL(rssUrl);
    if (feed && feed.items && feed.items.length > 0) {
      // Set latestItemTimestamp to the most recent item in the feed
      latestItemTimestamp = new Date(feed.items[0].pubDate).getTime();
      console.log(
        name,
        "Initialized latestItemTimestamp to",
        latestItemTimestamp
      );
    } else {
      console.log(
        name,
        "No items found in the RSS feed during initialization."
      );
    }
  } catch (error) {
    console.error(name, "Error initializing latest item timestamp:", error);
  }
}

async function checkRSSFeed(rssUrl, slackWebhookUrl, name) {
  console.log(name, "RSS URL:", rssUrl);

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
        console.log(name, "New item found:", item.link);
        sendToSlack(item, slackWebhookUrl);
      }
    });

    if (newLatestTimestamp > latestItemTimestamp) {
      latestItemTimestamp = newLatestTimestamp;
      console.log(name, "Updated latestItemTimestamp to", newLatestTimestamp);
    }

    backoffTime = 300000; // Reset backoff to 5 minutes after a successful fetch
  } catch (error) {
    if (error.statusCode === 429) {
      console.error(name, "Rate limit exceeded, backing off...");
      backoffTime = Math.min(backoffTime * 2, maxBackoffTime); // Exponential backoff
    } else {
      console.error("Error fetching RSS feed:", error);
    }
  } finally {
    console.log(name, "Next fetch in", backoffTime / 60000, "minutes.");
    setTimeout(checkRSSFeed, backoffTime);
  }
}

module.exports = checkRSSFeed;

// Initialize the latestItemTimestamp and start the first execution of the script
const rssUrl1 = process.env.RSS_URL1;
const slackWebhookUrl1 = process.env.SLACK_WEBHOOK_URL1;
const rssUrl2 = process.env.RSS_URL2;
const slackWebhookUrl2 = process.env.SLACK_WEBHOOK_URL2;

initializeLatestItemTimestamp(rssUrl1, "RSS1").then(() => {
  checkRSSFeed(rssUrl1, slackWebhookUrl1, "RSS1");
});

initializeLatestItemTimestamp(rssUrl2, "RSS2").then(() => {
  checkRSSFeed(rssUrl2, slackWebhookUrl2, "RSS2");
});
