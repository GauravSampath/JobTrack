import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const STATUSES = [
    "Not Applied",
    "Applied",
    "Assessment",
    "Interview",
    "Offer",
    "Rejected"
];

const EMPTY_FORM = {
    company: "",
    role: "",
    location: "",
    experience: "",
    jobUrl: "",
    status: "Not Applied",
    dateApplied: "",
    notes: ""
};

const STATUS_ICONS = {
    "Not Applied": "○",
    Applied: "↗",
    Assessment: "▤",
    Interview: "♙",
    Offer: "★",
    Rejected: "×"
};

function App() {
    // =========================
    // AUTHENTICATION STATE
    // =========================

    const [token, setToken] = useState(
        localStorage.getItem("token")
    );

    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch {
            return null;
        }
    });

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);

    // =========================
    // JOB STATE
    // =========================

    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);

    const [form, setForm] = useState({ ...EMPTY_FORM });

    const [editingJobId, setEditingJobId] = useState(null);

    // =========================
    // SEARCH, FILTER AND NAVIGATION
    // =========================

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [activeSection, setActiveSection] = useState("Dashboard");

    // =========================
    // FIND JOBS STATE
    // =========================

    const [jobSearchTerm, setJobSearchTerm] = useState("");
    const [jobSearchResults, setJobSearchResults] = useState([]);
    const [jobSearchLoading, setJobSearchLoading] = useState(false);
    const [jobSearchError, setJobSearchError] = useState("");
    const [jobSearchLocation, setJobSearchLocation] = useState("");
    const [savingJobId, setSavingJobId] = useState(null);

    // =========================
    // IN-APP TOAST NOTIFICATIONS
    // =========================

    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
    };

    useEffect(() => {
        if (!toast) return undefined;
        const timeoutId = window.setTimeout(() => setToast(null), 3500);
        return () => window.clearTimeout(timeoutId);
    }, [toast]);

    // =========================
    // FORM HELPERS
    // =========================

    const updateForm = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value
        }));
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditingJobId(null);
    };

    // =========================
    // LOGIN
    // =========================

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "Login failed.");
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            setToken(data.token);
            setUser(data.user);

            setEmail("");
            setPassword("");

            showToast("Login successful!");
        } catch (error) {
            console.error("Login error:", error);
            showToast("Unable to connect to the server.", "error");
        }
    };

    // =========================
    // REGISTER
    // =========================

    const handleRegister = async (e) => {
        e.preventDefault();

        const cleanName = name.trim();
        const cleanEmail = email.trim();

        if (!cleanName || !cleanEmail || !password) {
            showToast("Please fill in all fields.", "error");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: cleanName,
                    email: cleanEmail,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "Registration failed.");
                return;
            }

            showToast("Account created successfully! Please log in.");
            setName("");
            setEmail("");
            setPassword("");
            setIsRegistering(false);
        } catch (error) {
            console.error("Registration error:", error);
            showToast("Unable to connect to the server.", "error");
        }
    };

    // =========================
    // LOGOUT
    // =========================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setToken(null);
        setUser(null);
        setJobs([]);

        resetForm();
        setSearch("");
        setStatusFilter("All");
        setActiveSection("Dashboard");
    };

    // =========================
    // FETCH JOBS
    // =========================

    const fetchJobs = async () => {
        if (!token) return;

        setLoadingJobs(true);

        try {
            const response = await fetch(`${API_URL}/jobs`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    showToast("Your session has expired. Please log in again.", "error");
                    handleLogout();
                } else {
                    showToast(data.message || "Unable to load jobs.", "error");
                }
                return;
            }

            setJobs(data.jobs || []);
        } catch (error) {
            console.error("Fetch jobs error:", error);
            showToast("Unable to connect to the server while loading jobs.", "error");
        } finally {
            setLoadingJobs(false);
        }
    };

    // =========================
    // SEARCH JOBS FROM REMOTIVE
    // =========================



const handleSearchJobs = async (e) => {
    e.preventDefault();

    const keyword = jobSearchTerm.trim();

    if (!keyword) {
        setJobSearchError("Please enter a job title or keyword.");
        return;
    }

    setJobSearchLoading(true);
    setJobSearchError("");
    setJobSearchResults([]);

    try {
        const response = await fetch(
            `${API_URL}/job-search?search=${encodeURIComponent(keyword)}`
        );

        const data = await response.json();

        if (!response.ok) {
            setJobSearchError(data.message || "Unable to search for jobs.");
            return;
        }

        let results = data.jobs || [];
        console.log(
    "Remotive locations:",
    results.map((job) => ({
        title: job.title,
        location: job.location
    }))
);

        // Filter by meaningful keyword in the job title.
        const genericWords = [
            "developer",
            "engineer",
            "job",
            "jobs",
            "role",
            "position"
        ];

        const importantWords = keyword
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => !genericWords.includes(word));

        results = results.filter((job) => {
            const title = (job.title || "").toLowerCase();

            return (
                importantWords.length === 0 ||
                importantWords.every((word) => title.includes(word))
            );
        });

        // Keep only listings explicitly located in India or an Indian city.
        const indiaLocations = [
            "india",
            "hyderabad",
            "bengaluru",
            "bangalore",
            "chennai",
            "visakhapatnam",
            "vizag",
            "pune",
            "mumbai",
            "delhi",
            "new delhi",
            "noida",
            "gurugram",
            "gurgaon",
            "kolkata",
            "kochi",
            "cochin",
            "thiruvananthapuram",
            "trivandrum",
            "ahmedabad",
            "jaipur",
            "indore",
            "bhopal",
            "lucknow",
            "chandigarh",
            "coimbatore",
            "mysuru",
            "mysore",
            "mangaluru",
            "mangalore",
            "vadodara",
            " surat",
            "nagpur",
            "patna",
            "bhubaneswar",
            "ranchi",
            "dehradun",
            "gurugram"
        ];

        results = results.filter((job) => {
            const location = (job.location || "").toLowerCase();

            return indiaLocations.some((place) =>
                location.includes(place.trim())
            );
        });

        // If the user enters a location, narrow the India results further.
        const locationFilter = jobSearchLocation.trim().toLowerCase();

        if (locationFilter) {
    results = results.filter((job) =>
        (job.location || "").toLowerCase().includes(locationFilter)
    );
}

// Remove duplicate job listings
// Ignore location, spaces, hyphens, punctuation, and capitalization.
const seenJobs = new Set();

results = results.filter((job) => {
    const normalize = (value) => {
        return (value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
    };

    const title = normalize(job.title);
    const company = normalize(job.company);

    const uniqueKey = `${title}|${company}`;

    if (seenJobs.has(uniqueKey)) {
        return false;
    }

    seenJobs.add(uniqueKey);
    return true;
});
setJobSearchResults(results);
        if (results.length === 0) {
            setJobSearchError(
                "No matching jobs explicitly located in India were found. Try another keyword or Indian city."
            );
        }
    } catch (error) {
        console.error("Job search error:", error);
        setJobSearchError("Unable to connect to the job-search service.");
    } finally {
        setJobSearchLoading(false);
    }
};
    // =========================
    // SAVE A SEARCH RESULT
    // =========================

    const handleSaveSearchResult = async (job) => {
        if (!token) {
            showToast("Please log in to save a job.", "error");
            return;
        }

        setSavingJobId(job.externalId);

        try {
            const response = await fetch(`${API_URL}/jobs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    company: job.company || "Unknown company",
                    role: job.title || "Untitled role",
                    location: job.location || "",
                    experience: "",
                    job_url: job.jobUrl || "",
                    status: "Not Applied",
                    date_applied: null,
                    notes: `Found through ${job.source || "job search"}`
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast(data.message || "Unable to save this job.", "error");
                return;
            }

            setJobs((previousJobs) => [data.job, ...previousJobs]);
            showToast("Job saved to My Jobs!");
        } catch (error) {
            console.error("Save search result error:", error);
            showToast("Unable to connect to the server.", "error");
        } finally {
            setSavingJobId(null);
        }
    };

    useEffect(() => {
        if (token) {
            fetchJobs();
        }
    }, [token]);

    // =========================
    // ADD OR UPDATE JOB
    // =========================

    const handleSubmitJob = async (e) => {
        e.preventDefault();

        // Read values from the form object and remove extra spaces.
        const cleanCompany = form.company.trim();
        const cleanRole = form.role.trim();
        const cleanLocation = form.location.trim();
        const cleanExperience = form.experience.trim();
        const cleanJobUrl = form.jobUrl.trim();
        const cleanNotes = form.notes.trim();

        // Validate required fields.
        if (!cleanCompany || !cleanRole) {
            showToast("Please enter both the company and role.", "error");
            return;
        }

        // Validate the URL only if the user entered one.
        if (cleanJobUrl) {
            try {
                const parsedUrl = new URL(cleanJobUrl);

                if (
                    parsedUrl.protocol !== "http:" &&
                    parsedUrl.protocol !== "https:"
                ) {
                    showToast("The job URL must start with http:// or https://", "error");
                    return;
                }
            } catch {
                showToast("Please enter a valid job URL, including https://", "error");
                return;
            }
        }

        // Validate the selected status.
        if (!STATUSES.includes(form.status)) {
            showToast("Please select a valid application status.", "error");
            return;
        }

        const isEditing = editingJobId !== null;

        const jobData = {
            company: cleanCompany,
            role: cleanRole,
            location: cleanLocation,
            experience: cleanExperience,
            job_url: cleanJobUrl,
            status: form.status,
            date_applied: form.dateApplied || null,
            notes: cleanNotes
        };

        try {
            const response = await fetch(
                isEditing
                    ? `${API_URL}/jobs/${editingJobId}`
                    : `${API_URL}/jobs`,
                {
                    method: isEditing ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(jobData)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    showToast("Your session has expired. Please log in again.", "error");
                    handleLogout();
                } else {
                    showToast(data.message || "Unable to save the job.", "error");
                }
                return;
            }

            if (isEditing) {
                setJobs((previousJobs) =>
                    previousJobs.map((job) =>
                        String(job.id) === String(editingJobId)
                            ? data.job
                            : job
                    )
                );

                showToast("Job updated successfully!");
            } else {
                setJobs((previousJobs) => [
                    data.job,
                    ...previousJobs
                ]);

                showToast("Job added successfully!");
            }

            resetForm();
        } catch (error) {
            console.error("Save job error:", error);
            showToast("Unable to connect to the server.", "error");
        }
    };

    // =========================
    // LOAD JOB FOR EDITING
    // =========================

    const handleEditJob = (job) => {
        setEditingJobId(job.id);

        setForm({
            company: job.company || "",
            role: job.role || "",
            location: job.location || "",
            experience: job.experience || "",
            jobUrl: job.job_url || "",
            status: job.status || "Not Applied",
            dateApplied: job.date_applied
                ? String(job.date_applied).slice(0, 10)
                : "",
            notes: job.notes || ""
        });

        setActiveSection("Add Job");

        document.getElementById("add-job-section")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    };

    // =========================
    // DELETE JOB
    // =========================

    const handleDeleteJob = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this job?"
        );

        if (!confirmed) return;

        try {
            const response = await fetch(`${API_URL}/jobs/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    showToast("Your session has expired. Please log in again.", "error");
                    handleLogout();
                } else {
                    showToast(data.message || "Unable to delete the job.", "error");
                }
                return;
            }

            setJobs((previousJobs) =>
                previousJobs.filter(
                    (job) => String(job.id) !== String(id)
                )
            );

            if (String(editingJobId) === String(id)) {
                resetForm();
            }

            showToast("Job deleted successfully!");
        } catch (error) {
            console.error("Delete job error:", error);
            showToast("Unable to connect to the server.", "error");
        }
    };

    // =========================
    // DASHBOARD STATISTICS
    // =========================

    const totalJobs = jobs.length;

    const appliedJobs = jobs.filter(
        (job) => job.status === "Applied"
    ).length;

    const interviewJobs = jobs.filter(
        (job) => job.status === "Interview"
    ).length;

    const offerJobs = jobs.filter(
        (job) => job.status === "Offer"
    ).length;

    // =========================
    // SEARCH AND STATUS FILTER
    // =========================

    const filteredJobs = jobs.filter((job) => {
        const searchText = search.toLowerCase().trim();

        const matchesSearch =
            (job.company || "").toLowerCase().includes(searchText) ||
            (job.role || "").toLowerCase().includes(searchText) ||
            (job.location || "").toLowerCase().includes(searchText);

        const matchesStatus =
            statusFilter === "All" || job.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // =========================
    // SIDEBAR NAVIGATION
    // =========================

    const scrollToSection = (section) => {
    // Clear unsaved form values when opening a new Add Job form.
    // Keep the values when editing an existing job.
    if (section === "Add Job" && editingJobId === null) {
        resetForm();
    }

    setActiveSection(section);

    const elementId =
        section === "Dashboard"
            ? "dashboard-section"
            : section === "Find Jobs"
                ? "find-jobs-section"
                : section === "Add Job"
                    ? "add-job-section"
                    : "kanban-section";

    document.getElementById(elementId)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
};

    // =========================
    // LOGIN SCREEN
    // =========================

    if (!token) {
        return (
            <div className="login-page">
                {toast && (
                    <div className={`toast-notification ${toast.type}`} role="status" aria-live="polite">
                        <span className="toast-message">{toast.message}</span>
                        <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button>
                    </div>
                )}
                <div className="login-card">
                    <div className="brand-mark">▣</div>

                    <p className="eyebrow">YOUR CAREER COMPANION</p>

                    <h1>
                        Job<span>Track</span>
                    </h1>

                    <p className="login-subtitle">
                        Track your applications. Stay focused.
                        Get closer to your next opportunity.
                    </p>

                    <form
                        onSubmit={isRegistering ? handleRegister : handleLogin}
                        className="login-form"
                    >
                        {isRegistering && (
                            <>
                                <label htmlFor="register-name">Full name</label>
                                <input
                                    id="register-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </>
                        )}

                        <label htmlFor="login-email">Email address</label>
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />

                        <label htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            minLength={6}
                        />

                        <button className="primary-button" type="submit">
                            {isRegistering
                                ? "Create JobTrack Account"
                                : "Login to JobTrack"}
                            <span> →</span>
                        </button>
                    </form>

                    <p className="login-footer">
                        {isRegistering
                            ? "Already have an account? "
                            : "Don't have an account? "}
                        <button
                            type="button"
                            className="auth-switch-button"
                            onClick={() => {
                                setIsRegistering((previous) => !previous);
                                setName("");
                                setEmail("");
                                setPassword("");
                            }}
                        >
                            {isRegistering ? "Log in" : "Sign up"}
                        </button>
                    </p>

                    <p className="login-footer">
                        Keep going. Your next opportunity is closer than you think.
                    </p>
                </div>
            </div>
        );
    }

    // =========================
    // MAIN DASHBOARD
    // =========================

    return (
        <div className="app-shell">
            {toast && (
                <div className={`toast-notification ${toast.type}`} role="status" aria-live="polite">
                    <span className="toast-message">{toast.message}</span>
                    <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button>
                </div>
            )}
            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-icon">▣</div>

                    <div>
                        <h2>
                            Job<span>Track</span>
                        </h2>
                        <p>Track · Apply · Get Hired</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={
                            activeSection === "Dashboard"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() => scrollToSection("Dashboard")}
                    >
                        <span className="nav-icon">⌂</span>
                        Dashboard
                    </button>

                    <button
                        className={
                            activeSection === "Find Jobs"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() => scrollToSection("Find Jobs")}
                    >
                        <span className="nav-icon">⌕</span>
                        Find Jobs
                    </button>

                    <button
                        className={
                            activeSection === "Add Job"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() => scrollToSection("Add Job")}
                    >
                        <span className="nav-icon">＋</span>
                        Add Job
                    </button>

                    <button
                        className={
                            activeSection === "My Jobs"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() => scrollToSection("My Jobs")}
                    >
                        <span className="nav-icon">☷</span>
                        My Jobs
                    </button>

                    <button
                        className={
                            activeSection === "Kanban Board"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() => scrollToSection("Kanban Board")}
                    >
                        <span className="nav-icon">▦</span>
                        Kanban Board
                    </button>
                </nav>

                <div className="sidebar-bottom">
                    <div className="sidebar-quote">
                        <div className="quote-target">◎</div>
                        <p>Small steps every day lead to big dreams!</p>
                        <div className="quote-line" />
                        <div className="quote-mountains">⌁</div>
                    </div>

                    <button
                        className="nav-item logout-nav"
                        onClick={handleLogout}
                    >
                        <span className="nav-icon">⇥</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="main-content">
                {/* TOP HEADER */}
                <header className="topbar">
                    <div className="welcome-block">
                        <span className="wave-emoji">👋</span>

                        <div>
                            <h2>Welcome, {user?.name || "there"}!</h2>
                            <p>
                                Keep going. Your next opportunity is closer than you think.
                            </p>
                        </div>
                    </div>

                    <div className="topbar-actions">
                        <div className="profile-pill">
                            <span className="profile-avatar">♙</span>
                            <span>{user?.name || "My Account"}</span>
                            <span className="chevron">⌄</span>
                        </div>

                    </div>
                </header>

                {/* CONTENT ROW: left-column (scrollable middle) sits beside
                    content-grid (fixed sidebar) so only the middle scrolls */}
                <div className="content-row">
                {/* LEFT COLUMN: hero banner, stats, and find jobs stack together
                    so they don't get stretched by the taller side panel */}
                <div className="left-column">
                    {/* HERO BANNER */}
                    <section className="hero-banner">
                        <div className="hero-content">
                            <div className="hero-target">◎</div>

                            <div>
                                <h2>Your Career, Your Journey</h2>
                                <p>
                                    Track your applications, stay consistent,
                                    <br className="desktop-break" />
                                    and land your dream job.
                                </p>
                            </div>
                        </div>

                        <div className="hero-motto">
                            <span>Better</span>
                            <span>Opportunities</span>
                            <span>Ahead</span>
                            <div className="motto-underline" />
                        </div>
                    </section>

                    {/* DASHBOARD STATISTICS */}
                    <section className="stats-grid" id="dashboard-section">
                        <div className="stat-card stat-total">
                            <div className="stat-icon">▣</div>
                            <div className="stat-info">
                                <p>Total Jobs</p>
                                <strong>{totalJobs}</strong>
                                <small>↗ Your opportunities</small>
                            </div>
                            <div className="stat-sparkline">⌁</div>
                        </div>

                        <div className="stat-card stat-applied">
                            <div className="stat-icon">➤</div>
                            <div className="stat-info">
                                <p>Applied</p>
                                <strong>{appliedJobs}</strong>
                                <small>↗ Applications sent</small>
                            </div>
                            <div className="stat-sparkline">⌁</div>
                        </div>

                        <div className="stat-card stat-interviews">
                            <div className="stat-icon">♙</div>
                            <div className="stat-info">
                                <p>Interviews</p>
                                <strong>{interviewJobs}</strong>
                                <small>↗ Keep preparing</small>
                            </div>
                            <div className="stat-sparkline">⌁</div>
                        </div>

                        <div className="stat-card stat-offers">
                            <div className="stat-icon">★</div>
                            <div className="stat-info">
                                <p>Offers</p>
                                <strong>{offerJobs}</strong>
                                <small>↗ Your next chapter</small>
                            </div>
                            <div className="stat-sparkline">⌁</div>
                        </div>
                    </section>

                    {/* FIND JOBS */}
                    <section className="panel find-jobs-panel" id="find-jobs-section">
                        <div className="panel-heading">
                            <div className="heading-icon">⌕</div>
                            <div>
                                <h2>Find Jobs</h2>
                                <p>Search remote job listings and save opportunities to your tracker.</p>
                            </div>
                        </div>

                        <form className="job-form find-jobs-form" onSubmit={handleSearchJobs}>
                            <div className="form-field">
                                <label htmlFor="job-search-keyword">Job title or keyword</label>
                                <input
                                    id="job-search-keyword"
                                    value={jobSearchTerm}
                                    onChange={(e) => setJobSearchTerm(e.target.value)}
                                    placeholder="e.g. Full Stack Developer"
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="job-search-location">Location (optional)</label>
                                <input
                                    id="job-search-location"
                                    value={jobSearchLocation}
                                    onChange={(e) => setJobSearchLocation(e.target.value)}
                                    placeholder="e.g. India, Worldwide"
                                />
                            </div>

                            <div className="form-actions">
                                <button
                                    className="primary-button"
                                    type="submit"
                                    disabled={jobSearchLoading}
                                >
                                    {jobSearchLoading ? "Searching..." : "Search Jobs"}
                                </button>
                            </div>
                        </form>

                        {jobSearchError && <p className="no-results">{jobSearchError}</p>}
                        {jobSearchLoading && (
                            <p className="loading-message">Searching for jobs...</p>
                        )}

                        {!jobSearchLoading && jobSearchResults.length > 0 && (
                            <div className="job-search-results">
                                <p>
                                    Found <strong>{jobSearchResults.length}</strong> matching listings.
                                </p>

                                {jobSearchResults.map((job) => (
        <article
        className="job-card search-result-card"
        key={job.externalId}
    >
        <div className="job-card-top">
            <h4>{job.title || "Untitled role"}</h4>
        </div>

        <p className="job-card-role">
            {job.company || "Company not specified"}
        </p>

        <p className="job-card-description">
            {job.description || "No description provided for this listing."}
        </p>

        <div className="job-card-location">
            <span className="job-meta-icon">♧</span>
            <span>{job.location || "Location not specified"}</span>
        </div>

        <div className="job-search-meta">
            <div className="job-search-meta-item">
                <span className="job-meta-label">
                    <span className="job-meta-icon">▣</span>
                    Experience
                </span>
                <strong>{job.experience || "Not specified"}</strong>
            </div>

            <div className="job-search-meta-item">
                <span className="job-meta-label">
                    <span className="job-meta-icon">₹</span>
                    Salary
                </span>
                <strong>{job.salary || "Not specified"}</strong>
            </div>

            <div className="job-search-meta-item">
                <span className="job-meta-label">
                    <span className="job-meta-icon">♧</span>
                    Source
                </span>
                <strong>{job.source || "Adzuna"}</strong>
            </div>
        </div>

        <div className="job-card-actions">
            {job.jobUrl && (
                <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="job-link"
                >
                    Apply Now ↗
                </a>
            )}

            <button
                className="primary-button"
                type="button"
                disabled={savingJobId === job.externalId}
                onClick={() => handleSaveSearchResult(job)}
            >
                {savingJobId === job.externalId
                    ? "Saving..."
                    : "Save Job"}
            </button>
        </div>
    </article>
    ))}
                            </div>
                        )}
                    </section>

                    {/* KANBAN BOARD */}
                    <section className="panel kanban-panel" id="kanban-section">
                        <div className="kanban-toolbar">
                            <div className="kanban-title">
                                <span className="kanban-title-icon">▦</span>

                                <div>
                                    <h2>Application Kanban Board</h2>
                                    <p>
                                        Organize your job search, one step at a time.
                                    </p>
                                </div>
                            </div>

                            <div className="kanban-filters">
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="⌕  Search company, role, or location..."
                                    aria-label="Search jobs"
                                />

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    aria-label="Filter by status"
                                >
                                    <option value="All">All statuses</option>

                                    {STATUSES.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {loadingJobs && (
                            <p className="loading-message">
                                Loading your applications...
                            </p>
                        )}

                        <div className="kanban-board">
                            {STATUSES.map((boardStatus) => {
                                const columnJobs = filteredJobs.filter(
                                    (job) => job.status === boardStatus
                                );

                                const columnClass = boardStatus
                                    .toLowerCase()
                                    .replace(/\s+/g, "-");

                                return (
                                    <div
                                        className={`kanban-column ${columnClass}`}
                                        key={boardStatus}
                                    >
                                        <div className="column-heading">
                                            <span className="column-status-icon">
                                                {STATUS_ICONS[boardStatus]}
                                            </span>

                                            <h3>{boardStatus}</h3>

                                            <span className="column-count">
                                                {columnJobs.length}
                                            </span>
                                        </div>

                                        <div className="column-body">
                                            {columnJobs.length === 0 ? (
                                                <div className="empty-column">
                                                    <span className="empty-icon">▤</span>
                                                    <p>No jobs yet</p>
                                                </div>
                                            ) : (
                                                columnJobs.map((job) => (
                                                    <article
                                                        className="job-card"
                                                        key={job.id}
                                                    >
                                                        <div className="job-card-top">
                                                            <h4>{job.company}</h4>

                                                        </div>

                                                        <p className="job-card-role">
                                                            {job.role}
                                                        </p>

                                                        {job.location && (
                                                            <p className="job-card-location">
                                                                ♧ {job.location}
                                                            </p>
                                                        )}

                                                        {job.experience && (
                                                            <p className="job-card-experience">
                                                                ◷ {job.experience}
                                                            </p>
                                                        )}

                                                        {job.date_applied && (
                                                            <p className="job-card-date">
                                                                Applied:{" "}
                                                                {String(job.date_applied).slice(0, 10)}
                                                            </p>
                                                        )}

                                                        {job.notes && (
                                                            <p className="job-card-notes">
                                                                {job.notes}
                                                            </p>
                                                        )}

                                                        <div className="job-card-footer">
                                                            <span className="status-badge">
                                                                {STATUS_ICONS[job.status]}{" "}
                                                                {job.status}
                                                            </span>

                                                            <div className="job-card-actions">
        {job.job_url && (
            <a
                href={job.job_url}
                target="_blank"
                rel="noreferrer"
                className="job-link"
            >
                View ↗
            </a>
        )}

        <button
            className="edit-button"
            type="button"
            onClick={() => handleEditJob(job)}
        >
            Edit
        </button>

        <button
            className="delete-button"
            type="button"
            onClick={() => handleDeleteJob(job.id)}
        >
            Delete
        </button>
    </div>
                                                        </div>
                                                    </article>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {!loadingJobs && filteredJobs.length === 0 && (
                            <p className="no-results">
                                No matching jobs found. Try another search or add a job above.
                            </p>
                        )}
                    </section>

                    <footer className="app-footer">
                        <span>JobTrack</span> · Your career journey, organized.
                    </footer>
                </div>

                {/* ADD JOB AND QUICK TIPS */}
                <section className="content-grid">
                    <div className="panel add-job-panel" id="add-job-section">
                        <div className="panel-heading">
                            <div className="heading-icon">＋</div>

                            
<div>
    <h2>{editingJobId ? "Edit Job" : "Add Job"}</h2>
    <p>Fill in the details to track your application.</p>

    <p className="form-help">
        Add a job to keep your applications organized.
    </p>
</div>
                        </div>

                        <form className="job-form" onSubmit={handleSubmitJob}>
                            <div className="form-field">
                                <label htmlFor="company">
                                    ▣ Company <b>*</b>
                                </label>
                                <input
                                    id="company"
                                    value={form.company}
                                    onChange={(e) =>
                                        updateForm("company", e.target.value)
                                    }
                                    placeholder="e.g. Google"
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="role">
                                    ▣ Role <b>*</b>
                                </label>
                                <input
                                    id="role"
                                    value={form.role}
                                    onChange={(e) =>
                                        updateForm("role", e.target.value)
                                    }
                                    placeholder="e.g. Software Engineer"
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="location">♧ Location</label>
                                <input
                                    id="location"
                                    value={form.location}
                                    onChange={(e) =>
                                        updateForm("location", e.target.value)
                                    }
                                    placeholder="e.g. Hyderabad"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="experience">◷ Experience</label>
                                <input
                                    id="experience"
                                    value={form.experience}
                                    onChange={(e) =>
                                        updateForm("experience", e.target.value)
                                    }
                                    placeholder="e.g. 0-2 years"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="job-url">↗ Job URL</label>
                                <input
                                    id="job-url"
                                    type="url"
                                    value={form.jobUrl}
                                    onChange={(e) =>
                                        updateForm("jobUrl", e.target.value)
                                    }
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="status">▣ Status</label>
                                <select
                                    id="status"
                                    value={form.status}
                                    onChange={(e) =>
                                        updateForm("status", e.target.value)
                                    }
                                >
                                    {STATUSES.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field">
                               <label htmlFor="date-applied">📅 Date Applied</label>
                                <input
                                    id="date-applied"
                                    type="date"
                                    value={form.dateApplied}
                                    onChange={(e) =>
                                        updateForm("dateApplied", e.target.value)
                                    }
                                />
                            </div>

                            <div className="form-field notes-field">
                                <label htmlFor="notes">▤ Notes</label>
                                <textarea
                                    id="notes"
                                    value={form.notes}
                                    onChange={(e) =>
                                        updateForm("notes", e.target.value)
                                    }
                                    placeholder="Add any notes about this job..."
                                />
                            </div>

                            <div className="form-actions">
                                <button className="primary-button" type="submit">
                                    {editingJobId ? "✓ Update Job" : "＋ Add Job"}
                                </button>

                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={resetForm}
                                >
                                    ↻ {editingJobId ? "Cancel Edit" : "Reset"}
                                </button>
                            </div>
                        </form>
                    </div>

                    <aside className="panel tips-panel">
                        <div className="panel-heading tips-heading">
                            <div className="tips-bulb">☀</div>

                            <div>
                                <h2>Quick Tips</h2>
                            </div>
                        </div>

                        <ul className="tips-list">
                            <li><span>✓</span> Keep your resume updated</li>
                            <li><span>✓</span> Apply consistently</li>
                            <li><span>✓</span> Track your progress</li>
                            <li><span>✓</span> Prepare for interviews</li>
                            <li><span>✓</span> Stay positive!</li>
                        </ul>

                        <div className="tips-divider" />

                        <blockquote>
                            “Success doesn't come from what you do occasionally,
                            but what you do consistently.”
                        </blockquote>

                        <div className="tips-decoration">♧</div>
                    </aside>
                </section>
                </div>
            </main>
        </div>
    );
}

export default App;
