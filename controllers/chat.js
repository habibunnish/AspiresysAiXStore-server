const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

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
      "https://dev.aurascc.net/web-bff/invoke",
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
    console.log(error,'the error')
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

const getJobStatus = async (req, res,next) => {
  const jobId = req.params.jobId
  const job = jobs[jobId];
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.json(job);
};

module.exports = { chatStream, getJobStatus };
