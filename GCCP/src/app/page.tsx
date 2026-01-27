import Link from 'next/link';
import { 
  BookOpen, ClipboardCheck, Zap, Sparkles, ArrowRight, Brain, 
  Target, Clock, Workflow, CheckCircle2, TrendingUp,
  Lightbulb, FileText, Cpu, GitBranch, Gauge, Shield, Database
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Precision Design */}
      <section className="relative pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-700 text-[13px] font-medium mb-8">
              <Cpu className="w-3.5 h-3.5" />
              <span>Multi-Agent AI Content Generation System</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-medium tracking-tight mb-6 leading-tight text-zinc-900">
              Educational Content Generator
            </h1>
            
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto mb-4 leading-relaxed">
              Automated creation of lecture notes, assignments, and pre-reading materials using a 7-agent orchestration system.
            </p>
            <p className="text-sm text-zinc-500">Average generation time: ~6 minutes per content piece</p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3 mb-16 mt-8">
              <Link 
                href="/editor"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Content</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link 
                href="/archives"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-md hover:bg-zinc-50 transition-colors"
              >
                <Database className="w-4 h-4" />
                View Archives
              </Link>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { icon: Cpu, value: '7', label: 'AI Agents', color: 'zinc' },
                { icon: Clock, value: '~6 min', label: 'Avg. Generation', color: 'zinc' },
                { icon: FileText, value: '3', label: 'Content Types', color: 'zinc' },
                { icon: Workflow, value: 'Pipeline', label: 'Multi-Stage', color: 'zinc' },
              ].map((stat, i) => (
                <div 
                  key={i} 
                  className="bg-white p-5 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
                >
                  <stat.icon className="w-6 h-6 mx-auto mb-2 text-zinc-400" />
                  <div className="text-2xl font-medium text-zinc-900">{stat.value}</div>
                  <div className="text-[11px] text-zinc-500 font-medium mt-0.5 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Types - Minimal Design */}
      <section className="py-16 px-4 border-t border-zinc-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-medium mb-2 text-zinc-900">
              Content Types
            </h2>
            <p className="text-zinc-600 text-sm">
              Generate three types of educational content with consistent quality and formatting
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: 'Lecture Notes',
                description: 'Comprehensive, well-structured notes with examples, Mermaid diagrams, LaTeX equations, and key insights.',
                features: ['Visual Diagrams', 'Code Examples', 'Mathematical Notation', 'Summary Points'],
              },
              {
                icon: ClipboardCheck,
                title: 'Assignments',
                description: 'Intelligently crafted MCQs, multi-select, and subjective questions with detailed explanations and answer keys.',
                features: ['Multiple Formats', 'Auto-Grading Ready', 'CSV Export', 'Bloom\'s Taxonomy'],
              },
              {
                icon: Zap,
                title: 'Pre-Reading Materials',
                description: 'Engaging, curiosity-driven content that primes students for upcoming lessons and builds anticipation.',
                features: ['Story-Based', 'Real-World Links', 'Quick Overview', 'Hook Questions'],
              }
            ].map((content, i) => (
              <div 
                key={i}
                className="group p-6 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-md bg-zinc-900 flex items-center justify-center mb-4 group-hover:bg-zinc-800 transition-colors">
                  <content.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-zinc-900">
                  {content.title}
                </h3>
                <p className="text-zinc-600 text-[13px] leading-relaxed mb-4">
                  {content.description}
                </p>
                <div className="space-y-1.5">
                  {content.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[13px] text-zinc-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agent Architecture */}
      <section className="py-16 px-4 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-zinc-200 text-zinc-700 text-[13px] font-medium mb-6">
              <Workflow className="w-3.5 h-3.5" />
              Multi-Agent Orchestration
            </div>
            <h2 className="text-3xl font-medium mb-2 text-zinc-900">
              Seven Specialized AI Agents
            </h2>
            <p className="text-zinc-600 text-sm max-w-xl mx-auto">
              Each agent has a specific role, working together to ensure accuracy, quality, and consistency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { name: 'Course Detector', icon: Target, role: 'Identifies domain & course context' },
              { name: 'Analyzer', icon: Brain, role: 'Analyzes gaps in transcripts' },
              { name: 'Creator', icon: Lightbulb, role: 'Generates initial content draft' },
              { name: 'Sanitizer', icon: Shield, role: 'Removes sensitive information' },
              { name: 'Refiner', icon: Sparkles, role: 'Enhances quality & coherence' },
              { name: 'Reviewer', icon: CheckCircle2, role: 'Validates accuracy & standards' },
              { name: 'Formatter', icon: FileText, role: 'Structures into final format' },
            ].map((agent, i) => (
              <div 
                key={i}
                className="bg-white p-5 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                <agent.icon className="w-8 h-8 text-zinc-400 mb-3" />
                <h3 className="font-medium text-zinc-900 mb-1 text-sm">{agent.name}</h3>
                <p className="text-[12px] text-zinc-500">{agent.role}</p>
              </div>
            ))}
          </div>

          {/* Workflow Visualization */}
          <div className="bg-white rounded-md border border-zinc-200 p-6">
            <div className="flex items-center justify-between overflow-x-auto">
              <div className="flex items-center gap-3 min-w-max">
                <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
                <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
                <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
                <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
                <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
                <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
                <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="text-[12px] text-zinc-500 font-medium mt-4 flex items-center">
              <Gauge className="w-3.5 h-3.5 inline mr-1" />
              Typical flow: 45-60 seconds
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 border-t border-zinc-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-medium mb-2 text-zinc-900">
              Simple 4-Step Process
            </h2>
            <p className="text-zinc-600 text-sm">From idea to polished content in under a minute</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: Target, 
                step: '01',
                title: 'Define Your Topic', 
                desc: 'Enter topic, subtopics, and optionally upload lecture transcripts for gap analysis',
              },
              { 
                icon: GitBranch, 
                step: '02',
                title: 'AI Orchestration', 
                desc: 'Seven agents collaborate—detecting context, creating, refining, and validating content',
              },
              { 
                icon: Sparkles, 
                step: '03',
                title: 'Real-Time Generation', 
                desc: 'Watch as content streams live with progress tracking, cost estimation, and agent status',
              },
              { 
                icon: FileText, 
                step: '04',
                title: 'Edit & Export', 
                desc: 'Use built-in Markdown editor or CSV export for assignments. Save to archives',
              },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="bg-white p-6 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors">
                  <div className="text-[11px] font-medium text-zinc-400 mb-3 uppercase tracking-wider">
                    Step {step.step}
                  </div>
                  <step.icon className="w-8 h-8 text-zinc-400 mb-3" />
                  <h4 className="font-medium text-sm mb-2 text-zinc-900">{step.title}</h4>
                  <p className="text-[13px] text-zinc-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 px-4 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-medium mb-2 text-zinc-900">
              System Capabilities
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Workflow, title: 'Automated Pipeline', desc: '7-stage agent orchestration handles the entire content creation workflow' },
              { icon: Shield, title: 'Content Sanitization', desc: 'Automatic removal of sensitive information and inappropriate content' },
              { icon: CheckCircle2, title: 'Quality Validation', desc: 'Multi-pass review and refinement ensures consistency and accuracy' },
              { icon: FileText, title: 'Multiple Formats', desc: 'Markdown editor with live preview, CSV export for assignments' },
              { icon: Brain, title: 'Transcript Analysis', desc: 'Gap detection analyzes lecture transcripts to ensure complete coverage' },
              { icon: Database, title: 'Archive System', desc: 'Store and retrieve previously generated content with metadata' },
            ].map((benefit, i) => (
              <div key={i} className="flex gap-3 p-5 bg-white rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center">
                    <benefit.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-zinc-900 mb-1">{benefit.title}</h3>
                  <p className="text-[13px] text-zinc-600">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 px-4 border-t border-zinc-200">
        <div className="max-w-5xl mx-auto">
          <div className="bg-zinc-50 rounded-md p-8 border border-zinc-200">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-medium mb-1 text-zinc-900">Get Started</h2>
              <p className="text-zinc-600 text-sm">Choose your workflow</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Link 
                href="/editor"
                className="group p-6 bg-white rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-zinc-900 mb-1 flex items-center gap-2">
                      New Generation
                      <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </h3>
                    <p className="text-[13px] text-zinc-600 mb-2">
                      Create new lecture notes, assignments, or pre-reading materials
                    </p>
                    <div className="text-[12px] text-zinc-500">
                      • Enter topic and subtopics<br />
                      • Optional: Upload transcript<br />
                      • ~6 minutes processing time
                    </div>
                  </div>
                </div>
              </Link>
              <Link 
                href="/archives"
                className="group p-6 bg-white rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-zinc-900 flex items-center justify-center flex-shrink-0">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-zinc-900 mb-1 flex items-center gap-2">
                      Browse Archives
                      <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </h3>
                    <p className="text-[13px] text-zinc-600 mb-2">
                      Access previously generated content and history
                    </p>
                    <div className="text-[12px] text-zinc-500">
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