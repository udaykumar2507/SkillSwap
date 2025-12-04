import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  MapPin,
  Star,
  Edit3,
  Loader,
  Award,
  PlayCircle,
  X,
} from "lucide-react";
import api from "../api";

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewCert, setViewCert] = useState(null); // Modal Viewer

  // ✅ FIX — Add viewer URL helper here
  const getCertificateViewerURL = (url) => {
    if (!url) return url;

    // Cloudinary PDFs need ?raw=1
    if (url.toLowerCase().endsWith(".pdf")) {
      return `${url}?raw=1`;
    }
    return url;
  };

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await api.get("api/auth/me");
        setUser(res.data);
      } catch (err) {
        console.error("Profile fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );

  if (!user)
    return (
      <div className="text-center text-gray-600 mt-20">
        Failed to load profile.
      </div>
    );

  const {
    name,
    email,
    location,
    bio,
    price4,
    rating,
    ratingCount,
    skillsHave = [],
    skillsWant = [],
    certificates = [],
    profilePhoto,
  } = user;

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header */}
      <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow" />

      <div className="relative max-w-5xl mx-auto px-4 -mt-20">

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">

          <div className="flex items-center gap-6 w-full sm:w-auto">
            <div className="relative">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={name}
                  className="h-28 w-28 rounded-3xl object-cover border-4 border-gray-200 shadow-md"
                />
              ) : (
                <div className="h-28 w-28 rounded-3xl bg-gray-100 flex items-center justify-center border-4 border-gray-200 text-4xl font-semibold text-gray-600 shadow-md">
                  {initials}
                </div>
              )}

              <button
                onClick={() => navigate("/profile/edit")}
                className="absolute -bottom-1 -right-1 bg-white shadow border p-1.5 rounded-xl hover:bg-gray-50"
              >
                <Edit3 className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">{name}</h1>

              {location && (
                <p className="text-gray-600 mt-1 flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" /> {location}
                </p>
              )}

              {email && (
                <p className="text-gray-600 mt-1 flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" /> {email}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-10">
            <div className="text-center">
              <p className="text-gray-500 text-sm">Rating</p>
              <p className="text-xl font-semibold text-yellow-500 flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-yellow-500" />
                {rating || 4.3}
              </p>
              <p className="text-xs text-gray-500">({ratingCount || 20})</p>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-sm">Price</p>
              <p className="text-xl font-semibold text-gray-900">${price4 || 499}</p>
              <p className="text-xs text-gray-500">per 4 classes</p>
            </div>
          </div>
        </div>

        {/* About */}
        {bio && (
          <div className="bg-white rounded-2xl shadow-md p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">About</h2>
            <p className="text-gray-600 leading-relaxed">{bio}</p>
          </div>
        )}

        {/* Skills */}
        <SkillSection title="Skills I Can Teach" icon={<Award />} items={skillsHave} color="blue" />
        <SkillSection title="Skills I Want to Learn" icon={<Award />} items={skillsWant} color="purple" />

        {/* Certificates */}
        <div className="bg-white rounded-2xl shadow-md p-6 mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <PlayCircle className="w-5 h-5" /> Certificates
          </h2>

          {certificates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              {certificates.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setViewCert(item)}
                  className="bg-gray-100 hover:bg-gray-200 transition p-4 rounded-xl text-left shadow-sm flex justify-between items-center"
                >
                  <p className="text-gray-700 font-medium truncate">Certificate {idx + 1}</p>
                  <PlayCircle className="w-5 h-5 text-gray-500" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No certificates uploaded.</p>
          )}
        </div>

        {/* Edit Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate("/profile/edit")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Certificate Modal */}
      {viewCert && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full rounded-xl shadow-xl p-4 relative">

            <button
              className="absolute top-3 right-3 rounded-full bg-gray-200 p-1 hover:bg-gray-300"
              onClick={() => setViewCert(null)}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold mb-3 text-gray-800">Certificate Preview</h3>

            {/* ✅ FIXED PDF VIEWER */}
            {viewCert.endsWith(".pdf") ? (
              <iframe
                src={getCertificateViewerURL(viewCert)}
                className="w-full h-96 rounded-lg"
                title="PDF Certificate"
              />
            ) : (
              <img
                src={viewCert}
                alt="Certificate"
                className="w-full rounded-lg object-contain max-h-[500px]"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Skills Reusable Component */
function SkillSection({ title, icon, items, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mt-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span className="w-5 h-5">{icon}</span> {title}
      </h2>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((skill, idx) => (
            <span
              key={idx}
              className={`px-3 py-1.5 rounded-full bg-${color}-100 text-${color}-800 text-sm font-medium`}
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No skills added yet.</p>
      )}
    </div>
  );
}
