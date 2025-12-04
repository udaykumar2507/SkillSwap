// src/pages/EditProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  FileText,
  Video,
  DollarSign,
  AlertCircle,
  Check,
  User,
  BookOpen,
  Award,
  CreditCard,
  Camera,
  Trash2,
  PlusCircle,
} from "lucide-react";
import api from "../api";

/*
  REQUIREMENTS:
  - Create .env with REACT_APP_CLOUDINARY_CLOUD_NAME and REACT_APP_CLOUDINARY_UPLOAD_PRESET
  - Cloudinary unsigned preset must be created in your Cloudinary console.
*/

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;




const CATEGORIES = [
  {
    id: "programming",
    label: "Programming",
    skills: ["JavaScript", "Python", "Java", "C++", "React", "Node.js", "HTML/CSS", "SQL", "Other"],
  },
  {
    id: "music",
    label: "Music",
    skills: ["Guitar", "Piano", "Singing", "Drums", "Music Theory", "Other"],
  },
  {
    id: "languages",
    label: "Languages",
    skills: ["English", "Spanish", "Japanese", "Hindi", "French", "Other"],
  },
  {
    id: "art",
    label: "Art & Design",
    skills: ["Drawing", "Painting", "Graphic Design", "UI/UX", "Other"],
  },
  {
    id: "Others",
    label: "Others",
    skills: ["Other"],
  },
  // add more categories as needed
];

export default function EditProfilePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    age: "",
    location: "",
    bio: "",
    skillsHave: [], // array of strings
    skillsWant: [], // array of strings
    certificates: [], // array of URLs
    introVideo: "",
    teachMode: "both",
    price4: "",
    price6: "",
    profilePhoto: "", // Cloudinary URL
  });

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Temporary inputs/state for Skill selectors
  const [haveCategory, setHaveCategory] = useState(CATEGORIES[0].id);
  const [haveSkill, setHaveSkill] = useState(CATEGORIES[0].skills[0]);
  const [haveOtherInput, setHaveOtherInput] = useState("");

  const [wantCategory, setWantCategory] = useState(CATEGORIES[0].id);
  const [wantSkill, setWantSkill] = useState(CATEGORIES[0].skills[0]);
  const [wantOtherInput, setWantOtherInput] = useState("");

  const [profileUploading, setProfileUploading] = useState(false);
  const [certUploading, setCertUploading] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get("/api/auth/me");
        const u = res.data;
        setUserId(u._id);
        setForm({
          name: u.name || "",
          age: u.age || "",
          location: u.location || "",
          bio: u.bio || "",
          skillsHave: u.skillsHave || [],
          skillsWant: u.skillsWant || [],
          certificates: u.certificates || [],
          introVideo: u.introVideo || "",
          teachMode: u.teachMode || "both",
          price4: u.price4 || "",
          price6: u.price6 || "",
          profilePhoto: u.profilePhoto || "",
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const handleChangeRaw = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setSuccess(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    handleChangeRaw(name, value);
  };

  // Utility to upload single file to Cloudinary unsigned
  const uploadToCloudinary = async (file) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error("Cloudinary not configured. Set REACT_APP_CLOUDINARY_CLOUD_NAME and REACT_APP_CLOUDINARY_UPLOAD_PRESET in .env");
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);

    const resp = await fetch(url, {
      method: "POST",
      body: fd,
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error("Cloudinary upload failed: " + text);
    }

    const data = await resp.json();
    return data.secure_url;
  };

  // profile photo file selected
  const handleProfilePhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setProfileUploading(true);
      const url = await uploadToCloudinary(f);
      handleChangeRaw("profilePhoto", url);
    } catch (err) {
      console.error(err);
      setError("Profile photo upload failed");
    } finally {
      setProfileUploading(false);
    }
  };

  // certificates multiple upload
  const handleCertificates = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setCertUploading(true);
    setError("");
    try {
      const uploaded = [];
      // sequential uploads (could be parallel, but keep simple)
      for (const f of files) {
        const url = await uploadToCloudinary(f);
        uploaded.push(url);
      }
      handleChangeRaw("certificates", [...form.certificates, ...uploaded]);
    } catch (err) {
      console.error(err);
      setError("Certificate upload failed");
    } finally {
      setCertUploading(false);
    }
  };

  // Remove certificate from list
  const removeCertificate = (idx) => {
    const arr = [...form.certificates];
    arr.splice(idx, 1);
    handleChangeRaw("certificates", arr);
  };

  // Skill add/remove helpers
  const addHaveSkill = () => {
    const skill = haveSkill === "Other" ? haveOtherInput.trim() : haveSkill;
    if (!skill) return;
    if (form.skillsHave.includes(skill)) {
      setHaveOtherInput("");
      return;
    }
    handleChangeRaw("skillsHave", [...form.skillsHave, skill]);
    setHaveOtherInput("");
  };
  const removeHaveSkill = (idx) => {
    const arr = [...form.skillsHave];
    arr.splice(idx, 1);
    handleChangeRaw("skillsHave", arr);
  };

  const addWantSkill = () => {
    const skill = wantSkill === "Other" ? wantOtherInput.trim() : wantSkill;
    if (!skill) return;
    if (form.skillsWant.includes(skill)) {
      setWantOtherInput("");
      return;
    }
    handleChangeRaw("skillsWant", [...form.skillsWant, skill]);
    setWantOtherInput("");
  };
  const removeWantSkill = (idx) => {
    const arr = [...form.skillsWant];
    arr.splice(idx, 1);
    handleChangeRaw("skillsWant", arr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        price4: form.price4 ? Number(form.price4) : 0,
        price6: form.price6 ? Number(form.price6) : 0,
        // skillsHave / skillsWant / certificates / profilePhoto are already arrays/strings
      };

      await api.put(`/api/users/${userId}`, payload);
      setSuccess(true);
      setTimeout(() => navigate(`/my-profile`), 1400);
    } catch (err) {
      console.error(err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-slate-600 text-base font-medium">Loading your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Profile</h1>
          <p className="text-slate-600">Update your information and preferences</p>
        </div>

        <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
          {success && (
            <div className="mx-6 mt-6 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex-shrink-0 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <p className="text-sm text-emerald-900 font-medium">Profile updated successfully</p>
            </div>
          )}

          {error && (
            <div className="mx-6 mt-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-900 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Section title="Basic Information" icon={<User className="w-5 h-5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700">Profile Photo</label>
                  <div className="mt-2">
                    <div className="w-36 h-36 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
                      {form.profilePhoto ? (
                        <img src={form.profilePhoto} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Camera />
                          <p className="text-xs">No photo</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        {profileUploading ? "Uploading..." : "Upload"}
                        <input type="file" accept="image/*" onChange={handleProfilePhoto} className="hidden" />
                      </label>

                      {form.profilePhoto && (
                        <button
                          type="button"
                          onClick={() => handleChangeRaw("profilePhoto", "")}
                          className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm"
                        >
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <Field
                    label="Full Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Age"
                      name="age"
                      type="number"
                      min="18"
                      value={form.age}
                      onChange={handleChange}
                      placeholder="18"
                    />
                    <Field
                      label="Location"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      icon={<MapPin className="w-4 h-4" />}
                      placeholder="City, Country"
                    />
                  </div>

                  <TextArea
                    label="Bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    icon={<FileText className="w-4 h-4" />}
                    placeholder="Tell us about yourself, your experience, and what makes you passionate about teaching and learning"
                    rows={3}
                  />
                </div>
              </div>
            </Section>

            <Section title="Skills You Can Teach" icon={<BookOpen className="w-5 h-5" />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Category</label>
                  <select
                    value={haveCategory}
                    onChange={(e) => {
                      const cat = CATEGORIES.find((c) => c.id === e.target.value);
                      setHaveCategory(cat.id);
                      setHaveSkill(cat.skills[0]);
                      setHaveOtherInput("");
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Skill</label>
                  <select
                    value={haveSkill}
                    onChange={(e) => setHaveSkill(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {CATEGORIES.find((c) => c.id === haveCategory).skills.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  {haveSkill === "Other" ? (
                    <>
                      <label className="block text-sm font-medium text-slate-700">Enter skill</label>
                      <input
                        value={haveOtherInput}
                        onChange={(e) => setHaveOtherInput(e.target.value)}
                        placeholder="Type skill..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={addHaveSkill}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg">
                        <PlusCircle /> Add
                      </button>
                      <button type="button" onClick={() => { setHaveCategory(CATEGORIES[0].id); setHaveSkill(CATEGORIES[0].skills[0]); setHaveOtherInput(""); }}
                        className="px-3 py-2 border rounded-lg text-sm">Reset</button>
                    </div>
                  )}
                </div>
              </div>

              {haveSkill === "Other" && (
                <div className="mt-3">
                  <button type="button" onClick={addHaveSkill} className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg">
                    <PlusCircle /> Add Other
                  </button>
                </div>
              )}

              {/* list */}
              <div className="mt-4">
                <p className="text-sm text-slate-600 mb-2">Skills you can teach</p>
                <div className="flex flex-wrap gap-2">
                  {form.skillsHave.length === 0 && <p className="text-xs text-slate-400">No skills added yet</p>}
                  {form.skillsHave.map((s, idx) => (
                    <span key={s + idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm">
                      {s}
                      <button type="button" onClick={() => removeHaveSkill(idx)} className="text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Skills You Want to Learn" icon={<Award className="w-5 h-5" />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Category</label>
                  <select
                    value={wantCategory}
                    onChange={(e) => {
                      const cat = CATEGORIES.find((c) => c.id === e.target.value);
                      setWantCategory(cat.id);
                      setWantSkill(cat.skills[0]);
                      setWantOtherInput("");
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Skill</label>
                  <select
                    value={wantSkill}
                    onChange={(e) => setWantSkill(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {CATEGORIES.find((c) => c.id === wantCategory).skills.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  {wantSkill === "Other" ? (
                    <>
                      <label className="block text-sm font-medium text-slate-700">Enter skill</label>
                      <input
                        value={wantOtherInput}
                        onChange={(e) => setWantOtherInput(e.target.value)}
                        placeholder="Type skill..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={addWantSkill}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg">
                        <PlusCircle /> Add
                      </button>
                      <button type="button" onClick={() => { setWantCategory(CATEGORIES[0].id); setWantSkill(CATEGORIES[0].skills[0]); setWantOtherInput(""); }}
                        className="px-3 py-2 border rounded-lg text-sm">Reset</button>
                    </div>
                  )}
                </div>
              </div>

              {wantSkill === "Other" && (
                <div className="mt-3">
                  <button type="button" onClick={addWantSkill} className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg">
                    <PlusCircle /> Add Other
                  </button>
                </div>
              )}

              <div className="mt-4">
                <p className="text-sm text-slate-600 mb-2">Skills you want to learn</p>
                <div className="flex flex-wrap gap-2">
                  {form.skillsWant.length === 0 && <p className="text-xs text-slate-400">No skills added yet</p>}
                  {form.skillsWant.map((s, idx) => (
                    <span key={s + idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm">
                      {s}
                      <button type="button" onClick={() => removeWantSkill(idx)} className="text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Teaching & Credentials" icon={<Video className="w-5 h-5" />}>
              <Field
                label="Introduction Video URL"
                name="introVideo"
                value={form.introVideo}
                onChange={handleChange}
                icon={<Video className="w-4 h-4" />}
                placeholder="https://youtube.com/watch?v=..."
                helperText="Share a video introducing yourself and your teaching style"
              />

              <div>
                <label className="block text-sm font-medium text-slate-700">Certificates (upload)</label>
                <div className="mt-2 flex gap-3 items-center">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    {certUploading ? "Uploading..." : "Upload certificates"}
                    <input type="file" accept="image/*,application/pdf" multiple onChange={handleCertificates} className="hidden" />
                  </label>

                  <p className="text-xs text-slate-500">You can upload images or PDF certificates</p>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {form.certificates.map((c, idx) => (
                    <div key={c + idx} className="flex items-center gap-3 border border-slate-100 p-2 rounded-lg">
                      {c.endsWith(".pdf") ? (
                        <div className="w-14 h-14 bg-slate-50 rounded-md flex items-center justify-center text-xs">PDF</div>
                      ) : (
                        <img src={c} alt={`cert-${idx}`} className="w-14 h-14 object-cover rounded-md" />
                      )}
                      <div className="flex-1 text-sm">
                        <div className="truncate">{c}</div>
                        <div className="mt-1 flex gap-2">
                          <a target="_blank" rel="noreferrer" href={c} className="text-xs text-slate-600 underline">Open</a>
                          <button type="button" onClick={() => removeCertificate(idx)} className="text-xs text-red-600">Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {form.certificates.length === 0 && <p className="text-xs text-slate-400">No certificates uploaded</p>}
                </div>
              </div>

              <Select
                label="Teaching Mode"
                name="teachMode"
                value={form.teachMode}
                onChange={handleChange}
                options={[
                  { value: "paid", label: "Paid Only" },
                  { value: "exchange", label: "Skill Exchange Only" },
                  { value: "both", label: "Both Paid & Exchange" }
                ]}
                helperText="Choose how you'd like to offer your teaching services"
              />
            </Section>

            <Section title="Pricing" icon={<CreditCard className="w-5 h-5" />} isLast>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field
                  label="4-Class Package"
                  name="price4"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price4}
                  onChange={handleChange}
                  icon={<DollarSign className="w-4 h-4" />}
                  placeholder="0.00"
                />
                <Field
                  label="6-Class Package"
                  name="price6"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price6}
                  onChange={handleChange}
                  icon={<DollarSign className="w-4 h-4" />}
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Leave blank or set to 0 if offering free or exchange-only</p>
            </Section>

            <div className="flex gap-3 p-6 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-white hover:border-slate-400 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || success}
                className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {saving ? "Saving..." : success ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* --- Small UI helper components --- */

function Section({ title, icon, children, isLast }) {
  return (
    <div className={`p-6 ${!isLast ? 'border-b border-slate-200' : ''}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className="text-slate-700">{icon}</div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Field({ label, icon, helperText, ...props }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent hover:border-slate-400 ${icon ? 'pl-10' : ''}`}
        />
      </div>
      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}

function TextArea({ label, icon, helperText, rows = 3, ...props }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-3 text-slate-400">
            {icon}
          </span>
        )}
        <textarea
          {...props}
          rows={rows}
          className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 outline-none resize-none transition-all duration-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent hover:border-slate-400 ${icon ? 'pl-10' : ''}`}
        />
      </div>
      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}

function Select({ label, options, helperText, ...props }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <select
        {...props}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 outline-none transition-all duration-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent hover:border-slate-400 bg-white cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
