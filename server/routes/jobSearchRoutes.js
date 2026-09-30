
const express = require("express");

const router = express.Router();


function extractExperience(description = "") {
    const text = description.replace(/<[^>]*>/g, " ");

    const patterns = [
        /\b\d+\s*(?:-|–|to)\s*\d+\s*\+?\s*years?\b/i,
        /\b\d+\s*\+\s*years?\b/i,
        /\b\d+\s*years?\b/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match) {
            return match[0].replace(/\s+/g, " ").trim();
        }
    }

    return "Not specified";
}

// GET /api/job-search?search=developer
router.get("/", async (req, res) => {
    try {
        const search = req.query.search?.trim();

        if (!search) {
            return res.status(400).json({
                message: "Please provide a search keyword."
            });
        }

        // Read credentials from server/.env
        const appId = process.env.ADZUNA_APP_ID;
        const appKey = process.env.ADZUNA_APP_KEY;

        if (!appId || !appKey) {
            console.error("Adzuna credentials are missing.");

            return res.status(500).json({
                message: "Job-search service is not configured."
            });
        }

        // Search Adzuna's India jobs endpoint
        const apiUrl = new URL(
            "https://api.adzuna.com/v1/api/jobs/in/search/1"
        );

        apiUrl.searchParams.set("app_id", appId);
        apiUrl.searchParams.set("app_key", appKey);
        apiUrl.searchParams.set("results_per_page", "20");
        apiUrl.searchParams.set("what", search);
        apiUrl.searchParams.set("content-type", "application/json");

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
            console.error("Adzuna API returned status:", response.status);

            return res.status(502).json({
                message: "The job provider is currently unavailable."
            });
        }

        // Convert Adzuna listings into the format used by JobTrack
        const jobs = (data.results || []).map((job) => ({
            externalId: String(job.id),
            title: job.title || "Untitled job",
            description: job.description || "",
            experience: extractExperience(job.description || ""),
            company: job.company?.display_name || "Not specified",
            location: job.location?.display_name || "Not specified",
            jobType: job.contract_time || job.contract_type || "Not specified",
            category: job.category?.label || "Not specified",
            salary:
                job.salary_min && job.salary_max
                    ? `${job.salary_min} - ${job.salary_max}`
                    : job.salary_min
                    ? `From ${job.salary_min}`
                    : job.salary_max
                    ? `Up to ${job.salary_max}`
                    : "Not specified",
            jobUrl: job.redirect_url,
            source: "Adzuna"
        }));

        return res.json({
            search,
            source: "Adzuna",
            count: jobs.length,
            jobs
        });
    } catch (error) {
        console.error("Job search error:", error.message);

        return res.status(500).json({
            message: "Unable to search for jobs right now."
        });
    }
});

module.exports = router;