const axios = require("axios");

const chatStream = async (req, res, next) => {
    try {
      const externalApiUrl = "https://dev.aurascc.net/web-bff/invoke/stream";
  
      // Extract necessary data from the request body
      const { flowId, flowAliasId, input } = req.body;
  
      // Make request to external API with streaming enabled
      const response = await axios.post(
        externalApiUrl,
        { flowId, flowAliasId, input },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: req.header("Authorization"), // Pass authorization from the client
          },
          responseType: "stream", // Important for streaming
          timeout:180000,
        }
      );
  
      // Set response headers for streaming
      res.setHeader("Content-Type", "application/json");
  
      // Pipe the external API response directly to the client
      response.data.pipe(res);
  
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
      console.error("Error fetching stream:", error);
      res.status(500).json({ error: "Failed to fetch stream" });
    }
  };

  module.exports= {chatStream}
