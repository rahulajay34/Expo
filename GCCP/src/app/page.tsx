import Link from 'next/link';
import { 
  BookOpen, ClipboardCheck, Zap, Sparkles, ArrowRight, Brain, 
  Target, Clock, Workflow, CheckCircle2, TrendingUp,
  Lightbulb, FileText, Cpu, GitBranch, Gauge, Shield, Database
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-white">
      {/* Hero Section - Enhanced */}
      <section className="relative overflow-hidden pt-16 pb-12 px-4">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 text-blue-800 text-sm font-semibold mb-6 shadow-sm">
              <Cpu className="w-4 h-4 animate-spin-slow" />
              <span>Multi-Agent AI Content Generation System</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                Educational Content Generator
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Automated creation of lecture notes, assignments, and pre-reading materials using a 7-agent orchestration system.
              <br />
              <span className="text-gray-500 text-lg">Average generation time: ~6 minutes per content piece</span>
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Link 
                href="/editor"
                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-2xl transition-all hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Sparkles className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Create Content</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/archives"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 text-lg font-semibold rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all hover:shadow-md"
              >
                <Database className="w-5 h-5" />
                View Archives
              </Link>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Cpu, value: '7', label: 'AI Agents', color: 'blue' },
                { icon: Clock, value: '~6 min', label: 'Avg. Generation', color: 'yellow' },
                { icon: FileText, value: '3', label: 'Content Types', color: 'green' },
                { icon: Workflow, value: 'Pipeline', label: 'Multi-Stage', color: 'purple' },
              ].map((stat, i) => (
                <div 
                  key={i} 
                  className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <stat.icon className={`w-8 h-8 mx-auto mb-3 text-${stat.color}-500`} />
                  <div className="text-3xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-xs text-gray-500 font-medium mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Types - Redesigned */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Content Types
            </h2>
            <p className="text-gray-600 text-lg">
              Generate three types of educational content with consistent quality and formatting
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                title: 'Lecture Notes',
                description: 'Comprehensive, well-structured notes with examples, Mermaid diagrams, LaTeX equations, and key insights.',
                gradient: 'from-orange-500 via-red-500 to-pink-500',
                features: ['Visual Diagrams', 'Code Examples', 'Mathematical Notation', 'Summary Points'],
                bgGradient: 'from-orange-50 to-red-50'
              },
              {
                icon: ClipboardCheck,
                title: 'Assignments',
                description: 'Intelligently crafted MCQs, multi-select, and subjective questions with detailed explanations and answer keys.',
                gradient: 'from-green-500 via-emerald-500 to-teal-500',
                features: ['Multiple Formats', 'Auto-Grading Ready', 'CSV Export', 'Bloom\'s Taxonomy'],
                bgGradient: 'from-green-50 to-emerald-50'
              },
              {
                icon: Zap,
                title: 'Pre-Reading Materials',
                description: 'Engaging, curiosity-driven content that primes students for upcoming lessons and builds anticipation.',
                gradient: 'from-purple-500 via-violet-500 to-indigo-500',
                features: ['Story-Based', 'Real-World Links', 'Quick Overview', 'Hook Questions'],
                bgGradient: 'from-purple-50 to-violet-50'
              }
            ].map((content, i) => (
              <div 
                key={i}
                className={`group relative p-8 rounded-3xl bg-gradient-to-br ${content.bgGradient} border-2 border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-300 hover:-translate-y-2`}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${content.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                  <content.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  {content.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  {content.description}
                </p>
                <div className="space-y-2">
                  {content.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agent Architecture - NEW */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-4">
              <Workflow className="w-4 h-4" />
              Multi-Agent Orchestration
            </div>
            <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Seven Specialized AI Agents
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Each agent has a specific role, working together to ensure accuracy, quality, and consistency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { name: 'Course Detector', icon: Target, role: 'Identifies domain & course context', color: 'blue' },
              { name: 'Analyzer', icon: Brain, role: 'Analyzes gaps in transcripts', color: 'purple' },
              { name: 'Creator', icon: Lightbulb, role: 'Generates initial content draft', color: 'yellow' },
              { name: 'Sanitizer', icon: Shield, role: 'Removes sensitive information', color: 'red' },
              { name: 'Refiner', icon: Sparkles, role: 'Enhances quality & coherence', color: 'pink' },
              { name: 'Reviewer', icon: CheckCircle2, role: 'Validates accuracy & standards', color: 'green' },
              { name: 'Formatter', icon: FileText, role: 'Structures into final format', color: 'indigo' },
            ].map((agent, i) => (
              <div 
                key={i}
                className="group bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-${agent.color}-100 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                <agent.icon className={`w-10 h-10 text-${agent.color}-500 mb-4 relative z-10`} />
                <h3 className="font-bold text-gray-900 mb-2 relative z-10">{agent.name}</h3>
                <p className="text-sm text-gray-600 relative z-10">{agent.role}</p>
              </div>
            ))}
          </div>

          {/* Workflow Visualization */}
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-300" />
                <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-300" />
                <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-300" />
                <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-300" />
                <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-300" />
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-300" />
                <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-sm text-gray-500 font-medium">
                <Gauge className="w-4 h-4 inline mr-1" />
                Typical flow: 45-60 seconds
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Enhanced */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Simple 4-Step Process
            </h2>
            <p className="text-gray-600 text-lg">From idea to polished content in under a minute</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                icon: Target, 
                step: '01',
                title: 'Define Your Topic', 
                desc: 'Enter topic, subtopics, and optionally upload lecture transcripts for gap analysis',
                color: 'blue'
              },
              { 
                icon: GitBranch, 
                step: '02',
                title: 'AI Orchestration', 
                desc: 'Seven agents collaborate—detecting context, creating, refining, and validating content',
                color: 'purple'
              },
              { 
                icon: Sparkles, 
                step: '03',
                title: 'Real-Time Generation', 
                desc: 'Watch as content streams live with progress tracking, cost estimation, and agent status',
                color: 'pink'
              },
              { 
                icon: FileText, 
                step: '04',
                title: 'Edit & Export', 
                desc: 'Use built-in Markdown editor or CSV export for assignments. Save to archives',
                color: 'green'
              },
            ].map((step, i) => (
              <div key={i} className="relative group">
                {/* Step connector line */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent -translate-x-4"></div>
                )}
                
                <div className="relative bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-400 transition-all hover:shadow-lg">
                  <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-gradient-to-br from-${step.color}-500 to-${step.color}-600 flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {step.step}
                  </div>
                  <step.icon className={`w-12 h-12 text-${step.color}-500 mb-4`} />
                  <h4 className="font-bold text-lg mb-2 text-gray-900">{step.title}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              System Capabilities
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Workflow, title: 'Automated Pipeline', desc: '7-stage agent orchestration handles the entire content creation workflow' },
              { icon: Shield, title: 'Content Sanitization', desc: 'Automatic removal of sensitive information and inappropriate content' },
              { icon: CheckCircle2, title: 'Quality Validation', desc: 'Multi-pass review and refinement ensures consistency and accuracy' },
              { icon: FileText, title: 'Multiple Formats', desc: 'Markdown editor with live preview, CSV export for assignments' },
              { icon: Brain, title: 'Transcript Analysis', desc: 'Gap detection analyzes lecture transcripts to ensure complete coverage' },
              { icon: Database, title: 'Archive System', desc: 'Store and retrieve previously generated content with metadata' },
            ].map((benefit, i) => (
              <div key={i} className="flex gap-4 p-6 bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-all">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{benefit.title}</h3>
                  <p className="text-sm text-gray-600">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-8 border border-gray-200">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Get Started</h2>
              <p className="text-gray-600">Choose your workflow</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Link 
                href="/editor"
                className="group p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                      New Generation
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Create new lecture notes, assignments, or pre-reading materials
                    </p>
                    <div className="text-xs text-gray-500">
                      • Enter topic and subtopics<br />
                      • Optional: Upload transcript<br />
                      • ~6 minutes processing time
                    </div>
                  </div>
                </div>
              </Link>
              <Link 
                href="/archives"
                className="group p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                      Browse Archives
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Access previously generated content and history
                    </p>
                    <div className="text-xs text-gray-500">
                      • Search by topic or date<br />
                      • View generation metadata<br />
                      • Re-export or edit content
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <section className="py-8 px-4 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>Powered by Claude AI (Sonnet 4) • Multi-Agent Architecture • Built with Next.js & Tailwind CSS</p>
        </div>
      </section>
    </div>
  );
}