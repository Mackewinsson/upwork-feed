const { default: axios } = require("axios");

async function sendToSlack(item) {
  const slackWebhookUrl =
    "https://hooks.slack.com/services/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";
  try {
    await axios.post(slackWebhookUrl, {
      text: `New item: ${item.title}\nLink: ${item.link}`,
    });
  } catch (error) {
    console.error("Error sending to Slack:", error);
  }
}

module.exports = sendToSlack;
