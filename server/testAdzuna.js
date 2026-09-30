require("dotenv").config();

async function testAdzuna() {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
        console.log("Missing Adzuna credentials in server/.env");
        return;
    }

    const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: "10",
        what: "software developer",
        where: "India",
        "content-type": "application/json"
    });

    const url =
        `https://api.adzuna.com/v1/api/jobs/in/search/1?${params}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("HTTP status:", response.status);

        if (!response.ok) {
            console.log("Adzuna API error:", data);
            return;
        }

        const jobs = data.results || [];

        console.log("Total matching jobs reported:", data.count);
        console.log("Jobs returned in this response:", jobs.length);

        console.log(
            "Sample jobs:",
            jobs.map((job) => ({
                title: job.title,
                company: job.company?.display_name,
                location: job.location?.display_name,
                applyLink: job.redirect_url
            }))
        );
    } catch (error) {
        console.error("Request failed:", error.message);
    }
}

testAdzuna();