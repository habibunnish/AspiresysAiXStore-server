const axios = require("axios");

const chatStream = async (req, res, next) => {
    try {
        const externalApiUrl = "https://dev.aurascc.net/web-bff/invoke/stream";
        const { flowId, flowAliasId, input } = req.body;

        // Set long timeout (5 min) for both Axios and Express
        req.setTimeout(300000); // 5 minutes
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Connection", "keep-alive"); // Keep connection open

        // Make request to external API with streaming enabled and long timeout
        const response = await axios.post(
            externalApiUrl,
            { flowId, flowAliasId, input },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: req.header("Authorization"), // Pass authorization from client
                },
                responseType: "stream", // Enable streaming
                timeout: 300000, // 5 minutes timeout
            }
        );

        // Listen to incoming data and send chunks to client to keep the connection alive
        response.data.on("data", (chunk) => {
            res.write(chunk); // Send chunk to client
        });

        // Handle stream completion
        response.data.on("end", () => {
            console.log("Stream ended successfully.");
            res.end();
        });

        // Handle errors
        response.data.on("error", (error) => {
            console.error("Stream error:", error);
            res.status(500).json({ error: "Stream error occurred" });
        });

    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error("Request timeout: Stream took too long.");
            res.status(504).json({ error: "Request timeout: Stream took too long to respond" });
        } else {
            console.error("Error fetching stream:", error);
            res.status(500).json({ error: "Failed to fetch stream" });
        }
    }
};

module.exports = { chatStream };
