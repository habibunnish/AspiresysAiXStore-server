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

async function processChatRequest(jobId, req, userQuery) {
  try {
    const { flowId, flowAliasId, input } = req.body;
    const response = await axios.post(
      `${process.env.BASE_URL}/invoke`,
      { flowId, flowAliasId, input },
      {
        params: { userQuery },
        headers: {
          "Content-Type": "application/json",
          Authorization: req.header("Authorization"), // Pass authorization from the client
        },
      }
    );

    jobs[jobId] = { status: "completed", data: response.data }; // Store response data
    cleanupJob(jobId); // Schedule cleanup
  } catch (error) {
    console.log(error, "the error");
    jobs[jobId] = {
      status: "failed",
      error: error.response?.data?.message || error.message,
    };
    cleanupJob(jobId); // Schedule cleanup for failed jobs
  }
}

function cleanupJob(jobId) {
  setTimeout(() => {
    delete jobs[jobId];
  }, JOB_CLEANUP_TIME);
}

const chatStream = async (req, res, next) => {
  try {
    const jobId = createJob(); // Create job
    processChatRequest(jobId, req, req.header("Authorization"));
    res.json({ jobId });
  } catch (error) {
    console.error("Error fetching stream:", error);
    res.status(500).json({ error: "Failed to fetch stream" });
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
    const jobId = createJob();
    const file = req.file;
    const formData = new FormData();

    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    processChatRequestFileAndQuery(formData, jobId, req, file);

    res.json({ jobId });
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
};

async function processChatRequestFileAndQuery(formData, jobId, req, file) {
  try {
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

    const secondRes = await axios.post(
      "https://dev.aurascc.net/web-bff/invoke",
      {
        flowId: "J4B1IAZK3H",
        flowAliasId: "70V7RVBXDP",
        input: file.originalname,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: req.header("Authorization"),
        },
      }
    );
    jobs[jobId] = { status: "completed", data: secondRes.data }; // Store response data
    cleanupJob(jobId); // Schedule cleanup
  } catch (error) {
    jobs[jobId] = {
      status: "failed",
      error: error.response?.data?.message || error.message,
    };
    cleanupJob(jobId); // Schedule cleanup for failed jobs
  }
}

module.exports = { chatStream, getJobStatus, requirementCapture, cleanupJob };
