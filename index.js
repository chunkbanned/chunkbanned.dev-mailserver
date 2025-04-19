const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const axios = require("axios");
require("dotenv").config();

// 🔗 Your Discord webhook
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

const server = new SMTPServer({
	authOptional: true,
	onData(stream, session, callback) {
		simpleParser(stream)
			.then((parsed) => {
				const { from, subject, text } = parsed;
				console.log(`Email from: ${from.text}`);

				// Extract the recipient email from the session
				const recipientEmail = session.envelope.rcptTo[0].address;

				// Try to extract verification URL or login code
				let messageContent = "";

				// Look for Steam verification URL
				const verifyUrlMatch = text.match(
					/Verify My Email Address: (https:\/\/store\.steampowered\.com\/account\/newaccountverification\?[^\s]+)/,
				);
				if (verifyUrlMatch && verifyUrlMatch[1]) {
					messageContent = `Steam Verification URL: <${verifyUrlMatch[1]}>`;
				} else {
					// Look for login code
					const loginCodeMatch = text.match(/Login Code\n*([A-Z0-9]{5})/);
					if (loginCodeMatch && loginCodeMatch[1]) {
						messageContent = `Login Code: ${loginCodeMatch[1]}`;
					} else {
						// If neither is found, use a default message
						messageContent =
							"No verification URL or login code found in email.";
					}
				}

				axios
					.post(DISCORD_WEBHOOK_URL, {
						content: `📧 **${recipientEmail}**\n${messageContent}`,
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

server.listen(process.env.PORT, () => {
	console.log(`Mail server running on port ${process.env.PORT}`);
	axios
		.post(DISCORD_WEBHOOK_URL, {
			content: "⚠️ **Mail Server Online**\nThe mail server is now online.",
		})
		.then(() => {
			console.log("Sent online notification to Discord");
		})
		.catch((err) => {
			console.error("Failed to send online notification:", err);
		});
});

// Add shutdown handler to notify Discord when server goes offline
process.on("SIGINT", () => {
	console.log("Server shutting down...");

	axios
		.post(DISCORD_WEBHOOK_URL, {
			content: "⚠️ **Mail Server Offline**\nThe mail server has been stopped.",
		})
		.then(() => {
			console.log("Sent offline notification to Discord");
			process.exit(0);
		})
		.catch((err) => {
			console.error("Failed to send offline notification:", err);
			process.exit(1);
		});
});

// Also handle SIGTERM for Docker or other process managers
process.on("SIGTERM", () => {
	console.log("Server shutting down...");

	axios
		.post(DISCORD_WEBHOOK_URL, {
			content: "⚠️ **Mail Server Offline**\nThe mail server has been stopped.",
		})
		.then(() => {
			console.log("Sent offline notification to Discord");
			process.exit(0);
		})
		.catch((err) => {
			console.error("Failed to send offline notification:", err);
			process.exit(1);
		});
});
