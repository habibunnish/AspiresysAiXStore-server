const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const FormData = require("form-data");

const jobs = {};
const JOB_CLEANUP_TIME = 10 * 60 * 1000;

const createJob = () => {
  const jobId = uuidv4();
  jobs[jobId] = { status: "processing" };
  return jobId;
};

async function processChatRequest(jobId, req, userQuery, res) {
  try {
    const { flowId, flowAliasId, input } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const response = await axios.post(
      `${process.env.BASE_URL}/invoke/stream`,
      { flowId, flowAliasId, input },
      {
        params: { userQuery },
        headers: {
          "Content-Type": "application/json",
          Authorization: req.header("Authorization"),
        },
        responseType: "stream", // Set response type to stream
      }
    );

    // Pipe the stream directly to response
    response.data.on("data", (chunk) => {
      if (!res.writableEnded) {
        res.write(chunk);
      }
    });

    response.data.on("end", () => {
      if (!res.writableEnded) {
        res.end();
      }
    });

    response.data.on("error", (error) => {
      console.error("Stream error:", error);
      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`
        );
        res.end();
      }
    });
  } catch (error) {
    console.error("Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to fetch stream" });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}

function cleanupJob(jobId) {
  setTimeout(() => {
    delete jobs[jobId];
  }, JOB_CLEANUP_TIME);
}

const chatStream = async (req, res, next) => {
  try {
    await processChatRequest(null, req, req.header("Authorization"), res);
  } catch (error) {
    console.error("Error fetching stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to fetch stream" });
    }
  }
};

const getJobStatus = async (req, res, next) => {
  const jobId = req.params.jobId;
  const job = jobs[jobId];
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.json(job);
};

const requirementCapture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const formData = new FormData();

    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    console.log("in req capture");
    await processChatRequestFileAndQuery(
      formData,
      res,
      req,
      file,
      "J4B1IAZK3H",
      "70V7RVBXDP",
      req.query.message
    );
  } catch (error) {
    console.error("Error in requirement capture:", error.message);
    if (!res.headersSent) {
      res.status(error.response?.status || 500).send({
        error: error.message,
        details: error.response?.data?.message || "Internal server error",
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};

async function processChatRequestFileAndQuery(
  formData,
  res,
  req,
  file,
  flowId,
  flowAliasId,
  message = false
) {
  try {
    // First upload the file
    await axios({
      method: "post",
      url: "https://dev.aurascc.net/web-bff/uploadFile?bucketName=transcript-document",
      data: formData,
      headers: {
        ...formData.getHeaders(),
        Authorization: req.header("Authorization"),
        Accept: "*/*",
        Connection: "keep-alive",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Make the second request with streaming
    const secondRes = await axios.post(
      "https://dev.aurascc.net/web-bff/invoke/stream",
      {
        flowId: flowId,
        flowAliasId: flowAliasId,
        input: message
          ? { input: message, transcript: file.originalname }
          : file.originalname,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: req.header("Authorization"),
        },
        responseType: "stream",
      }
    );

    // Pipe the stream directly to response
    secondRes.data.on("data", (chunk) => {
      if (!res.writableEnded) {
        res.write(chunk);
      }
    });

    secondRes.data.on("end", () => {
      if (!res.writableEnded) {
        res.end();
      }
    });

    secondRes.data.on("error", (error) => {
      console.error("Stream error:", error);
      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`
        );
        res.end();
      }
    });
  } catch (error) {
    console.error("Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message,
        details: error.response?.data?.message || "Internal server error",
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}

async function documentGenerationBedRock(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const jobId = createJob();
    const file = req.file;
    const message = req.body.message;
    const formData = new FormData();

    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    await processChatRequestFileAndQuery(
      formData,
      res,
      req,
      file,
      "K4YBCA88M0",
      "WV9JHFA1SD",
      message
    );
  } catch (error) {
    console.error("Error in requirement capture:", error.message);

    // Check if headers have been sent
    if (!res.headersSent) {
      res.status(error.response?.status || 500).send({
        error: error.message,
        details: error.response?.data?.message || "Internal server error",
      });
    } else {
      // If headers were already sent, send error event in SSE format
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}

module.exports = {
  chatStream,
  getJobStatus,
  requirementCapture,
  cleanupJob,
  documentGenerationBedRock,
};
