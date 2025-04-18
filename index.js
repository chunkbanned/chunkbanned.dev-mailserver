const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("simple-parser");
const axios = require("axios");

// 🔗 Your Discord webhook
const DISCORD_WEBHOOK_URL =
	"https://discord.com/api/webhooks/1362892716228477122/ZTsNkzHaJuDxVJzFDM-JXuYHy0nQIm6gppA7FJE_7YeuIlweAKF2Yj3fsbL_oJ75AcKt";

const server = new SMTPServer({
	authOptional: true,
	onData(stream, session, callback) {
		simpleParser(stream)
			.then((parsed) => {
				const { from, subject, text } = parsed;
				console.log(`Email from: ${from.text}`);
				axios
					.post(DISCORD_WEBHOOK_URL, {
						content: `📧 New Email Received\n**From**: ${from.text}\n**Subject**: ${subject}\n**Body**:\n${text.slice(0, 2000)}`,
					})
					.then(() => {
						console.log("Sent to Discord!");
						callback();
					})
					.catch((err) => {
						console.error("Error sending to Discord:", err);
						callback(err);
					});
			})
			.catch((err) => {
				console.error("Parse error:", err);
				callback(err);
			});
	},
	disabledCommands: ["AUTH"],
	logger: false,
});

server.listen(25, () => {
	console.log("Mail server running on port 25");
});
