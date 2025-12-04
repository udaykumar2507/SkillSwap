import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, BookOpen, DollarSign, Star, Loader } from 'lucide-react';
import api from '../api';

export default function DiscoverPage() {
  const [skill, setSkill] = useState('');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async (searchSkill = skill) => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (searchSkill.trim()) params.skill = searchSkill.trim();
      if (type !== 'all') params.type = type;
      if (sort) params.sort = sort;

      const res = await api.get('/api/users', { params });
      setUsers(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load instructors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [type, sort]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(skill);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Discover Instructors</h1>
          <p className="text-slate-600">Find skilled instructors to learn from or start teaching</p>
        </div>

        <div className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  placeholder="Search by skill (e.g., Guitar, Python)"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent hover:border-slate-400"
                />
              </div>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 outline-none transition-all duration-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent hover:border-slate-400 bg-white cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="paid">Paid Only</option>
                <option value="exchange">Exchange Only</option>
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 outline-none transition-all duration-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent hover:border-slate-400 bg-white cursor-pointer"
              >
                <option value="">Sort By</option>
                <option value="price_low">Price: Low → High</option>
                <option value="price_high">Price: High → Low</option>
                <option value="rating_high">Rating: High → Low</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md mt-2 md:mt-0"
            >
              Search
            </button>
          </form>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader className="w-8 h-8 text-slate-400 animate-spin" />
            <p className="text-slate-600 font-medium">Loading instructors</p>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <div className="text-red-600 mt-0.5">!</div>
            <p className="text-sm text-red-900 font-medium">{error}</p>
          </div>
        )}

        {users.length === 0 && !loading && !error && (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">No instructors found. Try different search criteria.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((u) => {
            const initials = getInitials(u.name, u.email);
            return (
              <div
                key={u._id}
                className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {u.profilePhoto ? (
                        <img
                          src={u.profilePhoto}
                          alt={u.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold text-base">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                        {u.name}
                      </h3>
                      {u.location && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{u.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {u.skillsHave?.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Teaches
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {u.skillsHave.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {u.skillsHave.length > 3 && (
                          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                            +{u.skillsHave.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Mode:</span>
                      <span className="font-semibold text-slate-900 capitalize">
                        {u.teachMode === 'both' ? 'Paid & Exchange' : u.teachMode}
                      </span>
                    </div>

                    {u.price4 > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">4 Classes:</span>
                        <div className="flex items-center gap-1 font-semibold text-slate-900">
                          <DollarSign className="w-4 h-4" />
                          {u.price4}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Rating:</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="font-semibold text-slate-900">
                          {u.rating?.toFixed ? u.rating.toFixed(1) : u.rating || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/profile/${u._id}`)}
                    className="w-full mt-4 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
