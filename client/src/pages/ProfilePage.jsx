// src/pages/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Users,
  Award,
  DollarSign,
  Video,
  FileText,
  Star,
  Loader,
  AlertCircle,
} from 'lucide-react';
import api from '../api';
import RequestForm from '../components/RequestForm';

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // modal state for request form
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('paid');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/api/users/${id}`);
        setUser(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  // callback after creating request
  const onRequestDone = (created) => {
    // default: go to Sent Requests page so learner can pay / track status
    navigate('/requests');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-white rounded-2xl px-6 py-5 shadow-md">
          <Loader className="w-8 h-8 text-gray-600 animate-spin" />
          <p className="text-gray-700 text-sm font-medium">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-300 rounded-2xl p-6 max-w-md w-full flex items-start gap-4 shadow-md">
          <div className="mt-1">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1 text-base">Couldn't load profile</h3>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full text-center shadow-md">
          <p className="text-gray-700 text-sm">No user found</p>
        </div>
      </div>
    );
  }

  const skillsHave = user.skillsHave || [];
  const skillsWant = user.skillsWant || [];
  const certificates = user.certificates || [];
  const rating = user.rating?.toFixed ? user.rating.toFixed(1) : user.rating || 0;
  const ratingCount = user.ratingCount || 0;

  const getInitials = (name, email) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const initials = getInitials(user.name, user.email);
  const teachLabel =
    user.teachMode === 'both'
      ? 'Paid & Skill Exchange'
      : user.teachMode === 'paid'
      ? 'Paid Classes'
      : user.teachMode === 'exchange'
      ? 'Skill Exchange'
      : 'Teaching';

  // Helper for PDF viewing
  const getCertificateViewerURL = (url) => {
    if (!url) return url;
    if (url.toLowerCase().endsWith('.pdf')) {
      return `${url}?raw=1`;
    }
    return url;
  };

  // Helper to embed YouTube video
  const getYouTubeEmbedURL = (url) => {
    if (!url) return '';
    const videoIdMatch = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : url;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto relative">
        <div className="bg-white border border-gray-200 shadow-lg rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="relative">
            <div className="h-32 bg-blue-100" />
            <div className="px-6 sm:px-10">
              <div className="-mt-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="relative">
                    {user.profilePhoto ? (
                      <img
                        src={user.profilePhoto}
                        alt={user.name}
                        className="h-24 w-24 rounded-3xl object-cover shadow-md border border-white/20"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-3xl bg-blue-500 flex items-center justify-center text-3xl font-semibold text-white shadow-md border border-white/20">
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="pb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{user.name}</h1>
                    {user.tagline && (
                      <p className="text-sm text-gray-600 mt-1 max-w-md">{user.tagline}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs sm:text-sm text-gray-700">
                      {user.location && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
                          <MapPin className="w-3.5 h-3.5" />
                          {user.location}
                        </span>
                      )}
                      {user.age && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
                          <Users className="w-3.5 h-3.5" />
                          {user.age} years old
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-700">
                        <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                        <span>
                          {rating}{' '}
                          <span className="text-[11px] text-yellow-600/80">
                            ({ratingCount} {ratingCount === 1 ? 'review' : 'reviews'})
                          </span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 pb-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 border border-blue-300 text-xs font-medium text-blue-700 uppercase tracking-wide">
                    <Award className="w-3.5 h-3.5" />
                    {teachLabel}
                  </span>
                  {user.experienceYears && (
                    <span className="text-xs text-gray-600">{user.experienceYears}+ years teaching</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 sm:px-10 py-8 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* About + Skills */}
              <div className="lg:col-span-2">
                {user.bio && (
                  <Section title="About" icon={<FileText className="w-5 h-5 text-blue-500" />}>
                    <p className="text-gray-700 text-sm leading-relaxed">{user.bio}</p>
                  </Section>
                )}

                <Section title="Skills" icon={<Award className="w-5 h-5 text-green-500" />}>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.14em] mb-3">
                        Teaches
                      </h4>
                      {skillsHave.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {skillsHave.map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">Not specified</p>
                      )}
                    </div>

                    {skillsWant.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.14em] mb-3">
                          Wants to Learn
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {skillsWant.map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Section>
              </div>

              {/* Pricing + Actions */}
              <div className="space-y-6">
                <Section title="Teaching & Pricing" icon={<DollarSign className="w-5 h-5 text-blue-600" />}>
                  <div className="grid grid-cols-1 gap-4">
                    {user.price4 > 0 && (
                      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.18em] mb-2">
                          4-Class Package
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mb-1">${user.price4}</p>
                        <p className="text-xs text-gray-500">Perfect if you want to try a short series.</p>
                      </div>
                    )}
                    {user.price6 > 0 && (
                      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.18em] mb-2">
                          6-Class Package
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mb-1">${user.price6}</p>
                        <p className="text-xs text-gray-500">Better for deeper learning with more sessions.</p>
                      </div>
                    )}
                    {user.price4 === 0 && user.price6 === 0 && (
                      <p className="text-gray-400 text-sm">Pricing not specified.</p>
                    )}
                  </div>
                </Section>

                <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">
                    Choose how you want to learn with this teacher:
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => { setRequestType('paid'); setShowRequestModal(true); }}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow hover:bg-blue-700 transition"
                    >
                      Request Paid Class
                    </button>
                    <button
                      onClick={() => { setRequestType('exchange'); setShowRequestModal(true); }}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition"
                    >
                      Request Skill Exchange
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Video + Certificates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {user.introVideo && (
                <Section title="Introduction" icon={<Video className="w-5 h-5 text-blue-500" />}>
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                    <iframe
                      src={getYouTubeEmbedURL(user.introVideo)}
                      title="Introduction Video"
                      className="w-full h-64 sm:h-80"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </Section>
              )}

              {certificates.length > 0 && (
                <Section title="Credentials" icon={<Award className="w-5 h-5 text-green-500" />}>
                  <div className="space-y-4">
                    {certificates.map((c, idx) => {
                      const isPDF = c.toLowerCase().endsWith('.pdf');
                      const viewerURL = getCertificateViewerURL(c);

                      return (
                        <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                          <a
                            href={c}
                            target="_blank"
                            rel="noreferrer"
                            className="block px-4 py-2 text-sm text-gray-700 font-medium hover:text-blue-700 transition truncate"
                          >
                            {c.split('/').pop()}
                          </a>
                          {isPDF && (
                            <iframe
                              src={viewerURL}
                              className="w-full h-64 border-t border-gray-200"
                              title={`Certificate ${idx + 1}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RequestForm modal integration */}
      {showRequestModal && (
        <RequestForm
          toUser={user._id}
          defaultType={requestType}
          onDone={onRequestDone}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-8 w-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700">
          {icon}
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
} 