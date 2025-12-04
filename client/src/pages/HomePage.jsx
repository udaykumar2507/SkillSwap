import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, Calendar, Shield, ArrowRight } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("ss_token");

  const features = [
    { icon: BookOpen, title: "Teach & Learn", description: "Share your expertise or learn new skills." },
    { icon: Users, title: "Skill Exchange", description: "Trade skills directly with others." },
    { icon: Calendar, title: "Flexible Scheduling", description: "Propose time slots and manage classes." },
    { icon: Shield, title: "Secure Payments", description: "Safe escrow payments for classes." },
  ];

  const steps = [
    { number: "01", title: "Create Your Profile", description: "Add skills, certificates, and teaching preferences." },
    { number: "02", title: "Discover Instructors", description: "Browse profiles and find your match." },
    { number: "03", title: "Schedule Classes", description: "Send requests and propose time slots." },
    { number: "04", title: "Learn & Grow", description: "Attend sessions and exchange reviews." },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-10 mb-12">
        <h1 className="text-4xl font-bold leading-tight mb-4 max-w-2xl">
          Welcome to SkillSwap
        </h1>
        <p className="text-blue-100 text-lg mb-6 max-w-2xl">
          A platform where people teach & learn skills through paid classes or skill exchange.
        </p>

        <div className="flex flex-wrap gap-4">
          {!isLoggedIn && (
            <button
              onClick={() => navigate("/register")}
              className="bg-white text-blue-700 px-5 py-3 rounded-lg font-semibold hover:bg-blue-50 flex items-center gap-2 transition"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => navigate("/discover")}
            className="bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Explore Instructors
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div key={idx} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 text-sm mt-1">{feature.description}</p>
            </div>
          );
        })}
      </div>

      {/* Steps */}
      <div className="bg-white rounded-2xl shadow-sm p-10">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div key={idx}>
              <div className="text-5xl font-bold text-blue-200">{step.number}</div>
              <h3 className="text-lg font-semibold text-gray-900 mt-2">{step.title}</h3>
              <p className="text-gray-600 text-sm mt-1">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
