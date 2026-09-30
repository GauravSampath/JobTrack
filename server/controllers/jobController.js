const pool = require("../db/database");

// CREATE JOB

const createJob = async (req, res) => {
    try {
        const {
            company,
            role,
            location,
            experience,
            job_url,
            status,
            date_applied,
            notes
        } = req.body;

        const cleanCompany = company?.trim();
        const cleanRole = role?.trim();
        const cleanJobUrl = job_url?.trim() || "";

        if (!cleanCompany || !cleanRole) {
            return res.status(400).json({
                message: "Company and role are required"
            });
        }

        // Check for an existing job belonging to this user.
        // If a URL is supplied, compare it as well.
        const duplicateCheck = cleanJobUrl
            ? await pool.query(
                `SELECT id
                 FROM jobs
                 WHERE user_id = $1
                   AND LOWER(TRIM(company)) = LOWER(TRIM($2))
                   AND LOWER(TRIM(role)) = LOWER(TRIM($3))
                   AND LOWER(TRIM(COALESCE(job_url, ''))) = LOWER(TRIM($4))
                 LIMIT 1`,
                [req.user.userId, cleanCompany, cleanRole, cleanJobUrl]
            )
            : await pool.query(
                `SELECT id
                 FROM jobs
                 WHERE user_id = $1
                   AND LOWER(TRIM(company)) = LOWER(TRIM($2))
                   AND LOWER(TRIM(role)) = LOWER(TRIM($3))
                 LIMIT 1`,
                [req.user.userId, cleanCompany, cleanRole]
            );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                message: "This job already exists in your tracker."
            });
        }

        const result = await pool.query(
            `INSERT INTO jobs
            (user_id, company, role, location, experience, job_url, status, date_applied, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                req.user.userId,
                cleanCompany,
                cleanRole,
                location?.trim() || "",
                experience?.trim() || "",
                cleanJobUrl,
                status || "Not Applied",
                date_applied || null,
                notes?.trim() || ""
            ]
        );

        return res.status(201).json({
            message: "Job created successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error("Create job error:", error.message);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// GET ALL JOBS
const getJobs = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM jobs
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.userId]
        );

        res.status(200).json({
            jobs: result.rows
        });

    } catch (error) {
        console.error("Get jobs error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// UPDATE JOB

const updateJob = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            company,
            role,
            location,
            experience,
            job_url,
            status,
            date_applied,
            notes
        } = req.body;

        const cleanCompany = company?.trim();
        const cleanRole = role?.trim();
        const cleanJobUrl = job_url?.trim() || "";

        if (!cleanCompany || !cleanRole) {
            return res.status(400).json({
                message: "Company and role are required"
            });
        }

        // Check for another matching job, excluding the job being edited.
        const duplicateCheck = cleanJobUrl
            ? await pool.query(
                `SELECT id
                 FROM jobs
                 WHERE user_id = $1
                   AND id <> $2
                   AND LOWER(TRIM(company)) = LOWER(TRIM($3))
                   AND LOWER(TRIM(role)) = LOWER(TRIM($4))
                   AND LOWER(TRIM(COALESCE(job_url, ''))) = LOWER(TRIM($5))
                 LIMIT 1`,
                [req.user.userId, id, cleanCompany, cleanRole, cleanJobUrl]
            )
            : await pool.query(
                `SELECT id
                 FROM jobs
                 WHERE user_id = $1
                   AND id <> $2
                   AND LOWER(TRIM(company)) = LOWER(TRIM($3))
                   AND LOWER(TRIM(role)) = LOWER(TRIM($4))
                 LIMIT 1`,
                [req.user.userId, id, cleanCompany, cleanRole]
            );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                message: "Another matching job already exists in your tracker."
            });
        }

        const result = await pool.query(
            `UPDATE jobs
             SET company = $1,
                 role = $2,
                 location = $3,
                 experience = $4,
                 job_url = $5,
                 status = $6,
                 date_applied = $7,
                 notes = $8
             WHERE id = $9
               AND user_id = $10
             RETURNING *`,
            [
                cleanCompany,
                cleanRole,
                location?.trim() || "",
                experience?.trim() || "",
                cleanJobUrl,
                status || "Not Applied",
                date_applied || null,
                notes?.trim() || "",
                id,
                req.user.userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Job not found"
            });
        }

        return res.status(200).json({
            message: "Job updated successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error("Update job error:", error.message);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// DELETE JOB
const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM jobs
             WHERE id = $1
             AND user_id = $2
             RETURNING *`,
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Job not found"
            });
        }

        res.status(200).json({
            message: "Job deleted successfully"
        });

    } catch (error) {
        console.error("Delete job error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
};


module.exports = {
    createJob,
    getJobs,
    updateJob,
    deleteJob
};