"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizer } from "../OrganizerProvider";
import type { CreateEventInput } from "@/lib/organizer/types";
import { ALL_EVENT_ROLES, filterRoles, EVENT_ROLE_CATEGORIES } from "@/lib/constants/eventRoles";

const CATEGORIES = [
  "Concert",
  "Exhibition",
  "College Fest",
  "Stand-up Comedy",
  "Corporate Event",
  "Sports",
  "Private Party",
  "Festival",
];

const COMMON_SKILLS = [
  "Good Communication",
  "English",
  "Hindi",
  "Tamil",
  "Punctual",
  "Crowd Control",
  "Tech-savvy",
  "Hospitality",
  "Photography",
  "Physical Stamina",
];

interface JobRow {
  name: string;
  vacancies: number;
  substituteCount: number;
  wageType: "DAILY" | "HOURLY";
  wage: number;
  requiredSkills: string[];
  eligibility: string;
}

/**
 * Smart searchable role input with dynamic keystroke autocomplete
 * Suggests roles across all 14 master event categories as the user types
 */
function RoleAutocompleteInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, []);

  const suggestions = filterRoles(query, 12);

  return (
    <div className="role-autocomplete-wrap" ref={containerRef}>
      <input
        type="text"
        className="inp"
        placeholder="Type to search roles (e.g. Stage Setup, Ticket Scanner, Sound Tech)..."
        value={query}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        required={required}
      />
      {open && suggestions.length > 0 && (
        <div className="role-suggestions-menu">
          <div className="role-suggestions-header">
            {query.trim() ? `Matching Roles (${suggestions.length})` : "Suggested Event Roles"}
          </div>
          {suggestions.map((item) => (
            <div
              key={`${item.category}-${item.role}`}
              className="role-suggestion-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item.role);
                setQuery(item.role);
                setOpen(false);
              }}
            >
              <span>{item.role}</span>
              <span className="role-category-tag">{item.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateEventView() {
  const { data, createEvent } = useOrganizer();
  const profile = data?.profile;
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Platform Fee Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [feeUtrInput, setFeeUtrInput] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const ADMIN_UPI_ID = "crewhub.admin@okaxis";

  // 1. Event Title & Description
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Concert");
  const [description, setDescription] = useState("");

  // 2. Event Date, Start Time, End Time
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 3);
  const defaultDateStr = defaultDate.toISOString().split("T")[0];

  const [eventDate, setEventDate] = useState(defaultDateStr);
  const [endDate, setEndDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  // 3. Event Location
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");

  // 4. Event Banner / Drag & Drop Image Upload (NO URL input)
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedBannerUrl, setUploadedBannerUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 5. Contact Information
  const [contactName, setContactName] = useState(profile?.name || "");
  const [contactPhone, setContactPhone] = useState(profile?.phone || "");
  const [contactEmail, setContactEmail] = useState(profile?.email || "");
  const [contactNotes, setContactNotes] = useState("");

  // Update contact info if profile loads asynchronously
  useEffect(() => {
    if (profile?.name && !contactName) setContactName(profile.name);
    if (profile?.phone && !contactPhone) setContactPhone(profile.phone);
    if (profile?.email && !contactEmail) setContactEmail(profile.email);
  }, [profile]);

  // 6. Event Status (Draft / Publish)
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");

  // 7. Crew Roles
  const [jobs, setJobs] = useState<JobRow[]>([
    {
      name: "Registration & Ticketing",
      vacancies: 3,
      substituteCount: 1,
      wageType: "DAILY",
      wage: 600,
      requiredSkills: ["Good Communication", "English"],
      eligibility: "Report 1 hour before event start in all-black formal attire.",
    },
    {
      name: "Crowd Management",
      vacancies: 4,
      substituteCount: 2,
      wageType: "DAILY",
      wage: 550,
      requiredSkills: ["Punctual", "Crowd Control"],
      eligibility: "Active, energetic, and polite behavior. Water and meals provided.",
    },
  ]);

  // Calculations
  const totalCrew = jobs.reduce((sum, j) => sum + (Number(j.vacancies) || 0), 0);
  const totalSubstitutes = jobs.reduce((sum, j) => sum + (Number(j.substituteCount) || 0), 0);
  const totalWages = jobs.reduce(
    (sum, j) => sum + (Number(j.vacancies) || 0) * (Number(j.wage) || 0),
    0
  );
  const platformFee = Math.round(totalWages * 0.1);
  const totalBudget = totalWages + platformFee;

  // Image Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please drop a valid image file (PNG, JPG, JPEG, WEBP)");
      return;
    }
    setError(null);
    setBannerFile(file);

    // Instant local preview
    const reader = new FileReader();
    reader.onload = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to local storage endpoint
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setUploadedBannerUrl(data.url);
      } else {
        console.warn("Upload fallback error:", data.error);
      }
    } catch (err) {
      console.warn("File upload network error, will save preview", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeBannerImage = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setUploadedBannerUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Crew Roles Handlers
  const addJobRow = () => {
    setJobs([
      ...jobs,
      {
        name: "Backstage Support",
        vacancies: 2,
        substituteCount: 1,
        wageType: "DAILY",
        wage: 500,
        requiredSkills: ["Punctual"],
        eligibility: "Assist production team and stage crew. Report 45 mins prior.",
      },
    ]);
  };

  const removeJobRow = (idx: number) => {
    if (jobs.length <= 1) return;
    setJobs(jobs.filter((_, i) => i !== idx));
  };

  const updateJob = (idx: number, patch: Partial<JobRow>) => {
    setJobs(jobs.map((j, i) => (i === idx ? { ...j, ...patch } : j)));
  };

  const toggleSkill = (jobIdx: number, skill: string) => {
    const j = jobs[jobIdx];
    const exists = j.requiredSkills.includes(skill);
    const updated = exists
      ? j.requiredSkills.filter((s) => s !== skill)
      : [...j.requiredSkills, skill];
    updateJob(jobIdx, { requiredSkills: updated });
  };

  // Form Submission
  const validateForm = () => {
    if (!title.trim()) {
      setError("Please enter the Event Title.");
      return false;
    }
    if (!description.trim()) {
      setError("Please provide an Event Description and staffing guidelines.");
      return false;
    }
    if (!venue.trim()) {
      setError("Please enter the Event Venue.");
      return false;
    }
    if (!city.trim()) {
      setError("Please enter the City.");
      return false;
    }
    if (!eventDate) {
      setError("Please select the Event Date.");
      return false;
    }
    if (jobs.length === 0) {
      setError("Please specify at least one Crew Role.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreateButtonClick = () => {
    if (!validateForm()) return;

    if (status === "PUBLISHED" && platformFee > 0) {
      setFeeUtrInput("");
      setPaymentError(null);
      setShowPaymentModal(true);
    } else {
      executeSubmit(status);
    }
  };

  const handleConfirmPaymentAndPublish = async () => {
    if (!feeUtrInput.trim()) {
      setPaymentError("Please enter your 12-digit UPI Transaction / UTR reference number.");
      return;
    }
    setPaymentError(null);
    await executeSubmit("PUBLISHED", feeUtrInput.trim());
    setShowPaymentModal(false);
  };

  const executeSubmit = async (
    targetStatus: "DRAFT" | "PUBLISHED",
    receiptRef?: string
  ) => {
    const startsAtIso = new Date(`${eventDate}T${startTime || "09:00"}:00`).toISOString();
    const endsAtIso = new Date(`${endDate || eventDate}T${endTime || "18:00"}:00`).toISOString();
    const deadlineDate = new Date(startsAtIso);
    deadlineDate.setDate(deadlineDate.getDate() - 1);
    const deadlineIso = deadlineDate.toISOString();

    // Construct enriched description with contact info & address
    const fullLocation = address ? `${venue}, ${address}` : venue;
    let fullDescription = description.trim();

    const contactSection = [
      `\n\n--- Coordinator & Contact Info ---`,
      contactName ? `Coordinator: ${contactName}` : null,
      contactPhone ? `Phone: ${contactPhone}` : null,
      contactEmail ? `Email: ${contactEmail}` : null,
      contactNotes ? `On-site note: ${contactNotes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    fullDescription += contactSection;

    const payload: CreateEventInput = {
      title: title.trim(),
      category,
      description: fullDescription,
      posterUrl: uploadedBannerUrl || bannerPreview || undefined,
      venue: fullLocation,
      city: city.trim(),
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      applicationDeadline: deadlineIso,
      status: targetStatus,
      platformFeeReceipt: receiptRef,
      jobs: jobs.map((j) => ({
        name: j.name.trim(),
        vacancies: Number(j.vacancies) || 1,
        substituteCount: Number(j.substituteCount) || 0,
        wageType: j.wageType,
        wage: Number(j.wage) || 0,
        requiredSkills: j.requiredSkills,
        eligibility: j.eligibility?.trim() || "",
      })),
    };

    setSubmitting(true);
    try {
      await createEvent(payload);
      router.push("/organizer?tab=overview");
    } catch (err: any) {
      setError(err.message || "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="org-create-container">
      <div className="org-create-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2>Create New Event</h2>
            <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: "15px" }}>
              Specify staffing requirements, crew roles, wages, banner, and publish to verified event crew.
            </p>
          </div>

          {/* Event Status Capsule Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)" }}>Status:</span>
            <div className="status-pill-toggle">
              <button
                type="button"
                className={`status-pill-btn ${status === "DRAFT" ? "active-draft" : ""}`}
                onClick={() => setStatus("DRAFT")}
              >
                <span className="ms" style={{ fontSize: "16px" }}>edit_note</span>
                Draft
              </button>
              <button
                type="button"
                className={`status-pill-btn ${status === "PUBLISHED" ? "active-publish" : ""}`}
                onClick={() => setStatus("PUBLISHED")}
              >
                <span className="ms" style={{ fontSize: "16px" }}>rocket_launch</span>
                Publish
              </button>
            </div>
          </div>
        </div>
      </div>

      {data?.isRestricted && (
        <div
          style={{
            background: "#fff0f0",
            border: "1.5px solid #ff4d4f",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <span className="ms" style={{ fontSize: "24px", color: "#d9363e", lineHeight: 1 }}>warning</span>
          <div>
            <h4 style={{ margin: "0 0 4px", color: "#a8071a", fontSize: "15px", fontWeight: 700 }}>
              Event Publishing Restricted ({data.overdueCount} Overdue Settlement{data.overdueCount === 1 ? "" : "s"})
            </h4>
            <p style={{ margin: 0, color: "#595959", fontSize: "13px", lineHeight: 1.45 }}>
              You have worker payments that exceeded the 24-hour post-checkout deadline.
              Please go to <b>Payments & Settlements</b> to transfer pending wages via UPI to restore full publishing access.
            </p>
          </div>
        </div>
      )}

      {error && <div className="org-error-banner">{error}</div>}

      <div className="org-form-grid">
        {/* Left Column: Form Sections */}
        <div className="org-form-main">
          {/* Section 1: Event Title & Description */}
          <div className="panel org-panel">
            <div className="org-section-title">
              <span className="ms">event_note</span>
              <h3>1. Event Title & Description</h3>
            </div>

            <div className="form-group">
              <label>Event Title *</label>
              <input
                type="text"
                className="inp"
                placeholder="e.g. Sunburn Campus Music Night, Tech Expo 2026, Comic Con"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Category *</label>
                <select
                  className="inp"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Target Audience / Scale</label>
                <select className="inp">
                  <option>Large Public Gathering (1,000+ Attendees)</option>
                  <option>Medium Event (200 - 1,000 Attendees)</option>
                  <option>Intimate / VIP Gathering (&lt; 200 Attendees)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Event Description & Brief *</label>
              <textarea
                className="inp"
                rows={4}
                placeholder="Describe the event, staffing expectations, dress code (e.g. black shirt, formal shoes), perks provided (meals, crew certificate, cab/travel allowance), etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Section 2: Event Banner / Image Upload (Drag & Drop, NO URL input) */}
          <div className="panel org-panel" style={{ marginTop: "24px" }}>
            <div className="org-section-title">
              <span className="ms">add_photo_alternate</span>
              <h3>2. Event Banner / Image Upload</h3>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: "-12px 0 16px", lineHeight: "1.5" }}>
              Upload your official event flyer or banner. Drag and drop from your computer or click to browse.
              <span style={{ display: "block", color: "#1a73e8", fontWeight: 600, marginTop: "4px" }}>
                Recommended image size: 1200 × 800 px (3:2 landscape aspect ratio) for perfect card display.
              </span>
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {!bannerPreview ? (
              <div
                className={`drag-drop-zone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="drag-drop-icon">
                  <span className="ms" style={{ fontSize: "28px" }}>
                    cloud_upload
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "15px", color: "#111" }}>
                  Drag and drop your event banner image here
                </div>
                <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                  or <span style={{ color: "var(--blue)", textDecoration: "underline" }}>browse from files</span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#eef2fe", color: "#1a73e8", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, marginTop: "8px" }}>
                  <span className="ms" style={{ fontSize: "16px" }}>aspect_ratio</span>
                  Recommended size: 1200 × 800 px
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                  Supports PNG, JPG, JPEG, WEBP (Max 10MB) · Fits 3:2 event cards perfectly
                </div>
              </div>
            ) : (
              <div className="drag-drop-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerPreview}
                  alt="Event Banner Preview"
                  className="drag-drop-img"
                  style={{ aspectRatio: "3 / 2", objectFit: "cover" }}
                />
                <div className="drag-drop-overlay">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>
                      {bannerFile?.name || "Uploaded Event Banner"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                      <span>{bannerFile ? `${(bannerFile.size / 1024).toFixed(0)} KB` : "Attached"}</span>
                      <span className="badge" style={{ background: "#eef2fe", color: "#1a73e8", fontSize: "11px", padding: "1px 8px" }}>1200 × 800 px fit</span>
                      {uploadingImage && <span>· Uploading...</span>}
                      {uploadedBannerUrl && <span>· Ready</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="ms">refresh</span> Change
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      style={{ color: "var(--red)" }}
                      onClick={removeBannerImage}
                    >
                      <span className="ms">delete</span> Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Date, Time & Location */}
          <div className="panel org-panel" style={{ marginTop: "24px" }}>
            <div className="org-section-title">
              <span className="ms">schedule</span>
              <h3>3. Event Date, Time & Location</h3>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Event Date *</label>
                <input
                  type="date"
                  className="inp"
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date (for multi-day events)</label>
                <input
                  type="date"
                  className="inp"
                  value={endDate}
                  min={eventDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  className="inp"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  className="inp"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Venue / Hall Name *</label>
                <input
                  type="text"
                  className="inp"
                  placeholder="e.g. Phoenix Marketcity, Hall 2, YMCA Grounds"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  className="inp"
                  placeholder="e.g. Chennai, Bangalore, Coimbatore, Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Street Address / Landmark</label>
              <input
                type="text"
                className="inp"
                placeholder="e.g. 142 Velachery Main Road, Near Metro Gate 1"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Section 4: Required Crew Count & Crew Roles */}
          <div className="panel org-panel" style={{ marginTop: "24px" }}>
            <div className="org-section-title-between">
              <div className="org-section-title" style={{ marginBottom: 0 }}>
                <span className="ms">badge</span>
                <h3>4. Crew Roles ({jobs.length})</h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <div className="crew-count-badge">
                  <span className="ms" style={{ fontSize: "18px" }}>groups</span>
                  <span>Primary: <b>{totalCrew}</b></span>
                </div>
                <div className="crew-count-badge" style={{ background: "#eef2ff", borderColor: "#c7d2fe", color: "#4338ca" }}>
                  <span className="ms" style={{ fontSize: "18px" }}>shield</span>
                  <span>Substitutes: <b>{totalSubstitutes}</b></span>
                </div>
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={addJobRow}
                >
                  <span className="ms">add</span> Add Role
                </button>
              </div>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "13px", margin: "8px 0 16px" }}>
              Add individual roles, vacancies, wages, and required skills. Type in the role field to search and select from 14 event role categories.
            </p>

            <div className="org-jobs-list">
              {jobs.map((job, idx) => (
                <div key={idx} className="org-job-card">
                  <div className="org-job-header">
                    <span className="org-job-num">Role #{idx + 1}</span>
                    {jobs.length > 1 && (
                      <button
                        type="button"
                        className="btn-del"
                        onClick={() => removeJobRow(idx)}
                        title="Remove role"
                      >
                        <span className="ms">delete</span>
                      </button>
                    )}
                  </div>

                  <div className="form-row-3">
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                      <label>Role Title *</label>
                      <RoleAutocompleteInput
                        value={job.name}
                        onChange={(val) => updateJob(idx, { name: val })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Required Crew Count *</label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        className="inp"
                        value={job.vacancies}
                        onChange={(e) => updateJob(idx, { vacancies: parseInt(e.target.value) || 1 })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Wage Type</label>
                      <select
                        className="inp"
                        value={job.wageType}
                        onChange={(e) => updateJob(idx, { wageType: e.target.value as any })}
                      >
                        <option value="DAILY">Per Day (₹/day)</option>
                        <option value="HOURLY">Per Hour (₹/hr)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Wage Amount per Person (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        className="inp"
                        value={job.wage}
                        onChange={(e) => updateJob(idx, { wage: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>

                  {/* Separate Section: Backup / Substitute Crew (Standby) */}
                  <div
                    className="org-substitute-card"
                    style={{
                      margin: "16px 0",
                      padding: "16px 18px",
                      borderRadius: "14px",
                      background: "#f9f9fe",
                      border: "1.5px dashed #c0c0e8",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="ms" style={{ fontSize: "20px", color: "#4f46e5" }}>
                          shield
                        </span>
                        <strong style={{ fontSize: "14px", color: "#111", letterSpacing: "-0.2px" }}>
                          Backup / Substitute Crew (Standby)
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#05944f",
                          background: "#e6f7ef",
                          padding: "3px 12px",
                          borderRadius: "999px",
                        }}
                      >
                        Paid Only If They Work
                      </span>
                    </div>

                    <div className="org-substitute-grid">
                      <div>
                        <label
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#222",
                            display: "block",
                            marginBottom: "6px",
                          }}
                        >
                          Standby Substitutes Count
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          className="inp"
                          placeholder="0 (Optional)"
                          value={job.substituteCount ?? 0}
                          onChange={(e) =>
                            updateJob(idx, { substituteCount: Math.max(0, parseInt(e.target.value) || 0) })
                          }
                          style={{ background: "#fff", fontWeight: 600 }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          lineHeight: "1.5",
                          background: "#fff",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "#333",
                            fontWeight: 600,
                            marginBottom: "2px",
                          }}
                        >
                          <span className="ms" style={{ fontSize: "15px", color: "#6366f1" }}>
                            info
                          </span>
                          Payment Policy:
                        </div>
                        Substitutes are on standby for emergencies or no-shows.
                        <strong style={{ color: "#111" }}>
                          {" "}They will only be paid if they check in and work on event day.
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Required Skills & Tags</label>
                    <div className="skill-pills-row">
                      {COMMON_SKILLS.map((sk) => {
                        const active = job.requiredSkills.includes(sk);
                        return (
                          <button
                            key={sk}
                            type="button"
                            className={`skill-pill ${active ? "active" : ""}`}
                            onClick={() => toggleSkill(idx, sk)}
                          >
                            {sk} {active ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Eligibility & Reporting Notes</label>
                    <input
                      type="text"
                      className="inp"
                      placeholder="e.g. Fluent in English/Tamil, report 45 mins prior in black attire"
                      value={job.eligibility}
                      onChange={(e) => updateJob(idx, { eligibility: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Contact Information */}
          <div className="panel org-panel" style={{ marginTop: "24px" }}>
            <div className="org-section-title">
              <span className="ms">contact_phone</span>
              <h3>5. Contact Information</h3>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: "-12px 0 16px" }}>
              Provide coordinator details so confirmed crew members know who to contact on event day.
            </p>

            <div className="form-row-3">
              <div className="form-group">
                <label>Coordinator Name *</label>
                <input
                  type="text"
                  className="inp"
                  placeholder="e.g. Mathangi S."
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Contact Phone Number *</label>
                <input
                  type="tel"
                  className="inp"
                  placeholder="e.g. +91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  className="inp"
                  placeholder="e.g. organizer@events.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>On-Site Reporting Instructions</label>
              <input
                type="text"
                className="inp"
                placeholder="e.g. Meet at Backstage Gate 2. Call coordinator upon arrival for security pass."
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Budget / Payment Details & Create Button */}
        <div className="org-form-side">
          <div className="panel org-cost-panel" style={{ position: "sticky", top: "84px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>Budget & Payment</h3>
              <span className="badge-pay badge-pay-confirmed">Live Estimate</span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 16px" }}>
              Transparent breakdown calculated in real-time.
            </p>

            <div className="cost-breakdown">
              <div className="cost-row">
                <span>Required Primary Crew</span>
                <b>{totalCrew} crew</b>
              </div>
              <div className="cost-row">
                <span>Standby Substitutes</span>
                <b style={{ color: "#4f46e5" }}>{totalSubstitutes} standby</b>
              </div>
              <div className="cost-row">
                <span>Crew Roles</span>
                <b>{jobs.length} roles</b>
              </div>
              <div className="cost-row">
                <span>Primary Crew Wages</span>
                <b>₹{totalWages.toLocaleString("en-IN")}</b>
              </div>
              {totalSubstitutes > 0 && (
                <div className="cost-row" style={{ fontSize: "12px", color: "var(--muted)" }}>
                  <span>Substitute Wages</span>
                  <span style={{ color: "#05944f", fontWeight: 600 }}>₹0 (Paid only if working)</span>
                </div>
              )}
              <div className="cost-row highlight">
                <span>
                  CrewHub Platform Fee (10%)
                  <small style={{ display: "block", color: "var(--muted)", fontWeight: "normal" }}>
                    Verified crew matching, replacement guarantee & attendance tracking
                  </small>
                </span>
                <b>₹{platformFee.toLocaleString("en-IN")}</b>
              </div>
              <div className="cost-divider" />
              <div className="cost-row total">
                <span>Total Estimated Budget</span>
                <span className="total-val">₹{totalBudget.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Event Status Selector In Side Panel */}
            <div style={{ margin: "16px 0", padding: "14px", background: "#f8f8fc", borderRadius: "14px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: "8px" }}>
                Event Status Selection
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: status === "DRAFT" ? "#111" : "var(--line)",
                    background: status === "DRAFT" ? "#fff" : "transparent",
                    fontWeight: status === "DRAFT" ? 700 : 500,
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                  onClick={() => setStatus("DRAFT")}
                >
                  Draft
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: status === "PUBLISHED" ? "#111" : "var(--line)",
                    background: status === "PUBLISHED" ? "#111" : "transparent",
                    color: status === "PUBLISHED" ? "#fff" : "#111",
                    fontWeight: status === "PUBLISHED" ? 700 : 500,
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                  onClick={() => setStatus("PUBLISHED")}
                >
                  Publish
                </button>
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                {status === "PUBLISHED"
                  ? "Publish opens registrations immediately and requires the 10% platform fee."
                  : "Draft saves event privately for later review without immediate fee."}
              </div>
            </div>

            <div className="cost-notice">
              <span className="ms">verified_user</span>
              <div>
                <strong>CrewHub Guarantee</strong>
                <span>Instant replacement matching if any confirmed crew cancels.</span>
              </div>
            </div>

            {/* Create Event Button */}
            <div className="form-actions-stack">
              <button
                type="button"
                className="btn full"
                disabled={submitting}
                onClick={handleCreateButtonClick}
              >
                <span className="ms">
                  {status === "PUBLISHED" ? "rocket_launch" : "save"}
                </span>
                {submitting
                  ? "Processing..."
                  : status === "PUBLISHED"
                  ? "Pay Fee & Publish Event"
                  : "Create Event (Draft)"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Fee Payment Modal */}
      {showPaymentModal && (
        <div className="modal-backdrop" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-box" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "20px" }}>10% Platform Fee Payment</h3>
              <span className="badge-pay badge-pay-pending">Payment Required</span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 16px" }}>
              To publish <b>{title}</b> and open applications to verified volunteers, pay the 10% platform fee to CrewHub Admin.
            </p>

            {/* Fee Breakdown Box */}
            <div style={{ background: "#f7f7fc", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px", marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span>Total Required Crew:</span>
                <b>{totalCrew} volunteers</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span>Total Volunteer Wages:</span>
                <b>₹{totalWages.toLocaleString("en-IN")}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 700, paddingTop: "8px", borderTop: "1px solid var(--line)", color: "#111" }}>
                <span>10% CrewHub Platform Fee:</span>
                <span style={{ fontSize: "18px", color: "var(--blue)" }}>₹{platformFee.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Admin UPI Details Card */}
            <div style={{ background: "#eef6fc", border: "1.5px dashed #b9d9ff", borderRadius: "14px", padding: "16px", marginBottom: "18px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "#1a73e8", marginBottom: "6px" }}>
                CrewHub Admin UPI Payment Details
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d2e3fc" }}>
                <code style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>{ADMIN_UPI_ID}</code>
                <button
                  type="button"
                  className="btn sm ghost"
                  style={{ padding: "4px 10px", fontSize: "12px" }}
                  onClick={() => {
                    navigator.clipboard?.writeText(ADMIN_UPI_ID);
                    setCopiedUpi(true);
                    setTimeout(() => setCopiedUpi(false), 2000);
                  }}
                >
                  <span className="ms" style={{ fontSize: "14px" }}>content_copy</span>
                  {copiedUpi ? "Copied!" : "Copy UPI ID"}
                </button>
              </div>
              <div style={{ fontSize: "12px", color: "#444", marginTop: "8px" }}>
                Payee: <b>CrewHub Technologies (Admin)</b> · Scan with GPay, PhonePe, Paytm or BHIM
              </div>
            </div>

            {paymentError && (
              <div style={{ color: "var(--red)", fontSize: "13px", fontWeight: 600, marginBottom: "12px" }}>
                {paymentError}
              </div>
            )}

            {/* UPI UTR Input */}
            <div className="form-group" style={{ marginBottom: "18px" }}>
              <label style={{ display: "flex", justifyContent: "space-between" }}>
                <span>UPI Transaction ID / 12-digit UTR Number *</span>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "var(--blue)", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setFeeUtrInput(`UTR-${Date.now().toString().slice(-8)}`)}
                >
                  Autofill Demo UTR
                </button>
              </label>
              <input
                type="text"
                className="inp"
                placeholder="e.g. 432109876543 or UPI/20261124/..."
                value={feeUtrInput}
                onChange={(e) => setFeeUtrInput(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={submitting}
                onClick={handleConfirmPaymentAndPublish}
              >
                <span className="ms">check_circle</span>
                {submitting ? "Processing..." : "Verify Payment & Publish Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
