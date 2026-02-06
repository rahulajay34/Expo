'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  AlertCircle,
  Info,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle
} from 'lucide-react';

// Create untyped client for meta_feedback table (not yet in Database types)
function getUntypedSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface QualityScores {
  formatting: number;
  pedagogy: number;
  clarity: number;
  structure: number;
  consistency: number;
  factualAccuracy: number;
}

type TrendDirection = 'improving' | 'declining' | 'stable';

interface ScoreTrends {
  formatting: TrendDirection;
  pedagogy: TrendDirection;
  clarity: TrendDirection;
  structure: TrendDirection;
  consistency: TrendDirection;
  factualAccuracy: TrendDirection;
}

interface IssueCluster {
  agent: string;
  category: string;
  frequency: number;
  severity: string;
  description: string;
  suggestedFix: string;
  examples: string[];
  lastSeen: string;
}

interface FeedbackContent {
  scores: QualityScores;
  scoreTrends: ScoreTrends;
  issuesClusters: IssueCluster[];
  strengths: string[];
  overallAssessment: string;
}

interface CumulativeFeedback {
  id: string;
  mode: string;
  feedback_content: FeedbackContent;
  generation_count: number;
  last_updated: string;
  created_at: string;
}

const modeLabels: Record<string, string> = {
  'pre-read': 'Pre-Read',
  'lecture': 'Lecture Notes',
  'assignment': 'Assignment'
};

const modeColors: Record<string, string> = {
  'pre-read': 'bg-purple-500',
  'lecture': 'bg-blue-500',
  'assignment': 'bg-emerald-500'
};

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200'
};

const severityIcons: Record<string, React.ReactNode> = {
  critical: <XCircle className="w-3.5 h-3.5" />,
  high: <AlertTriangle className="w-3.5 h-3.5" />,
  medium: <AlertCircle className="w-3.5 h-3.5" />,
  low: <Info className="w-3.5 h-3.5" />
};

function TrendIcon({ trend }: { trend: TrendDirection }) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'declining':
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
}

function ScoreBar({ score, label, trend }: { score: number; label: string; trend?: TrendDirection }) {
  const percentage = Math.round((score / 10) * 100);
  const barColor = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : score >= 4 ? 'bg-orange-500' : 'bg-red-500';
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-zinc-600">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-zinc-900">{score.toFixed(1)}</span>
          {trend && <TrendIcon trend={trend} />}
        </div>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function FeedbackCard({ feedback, onClear, isClearing }: { 
  feedback: CumulativeFeedback; 
  onClear: (mode: string) => void;
  isClearing: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const content = feedback.feedback_content;
  const hasData = feedback.generation_count > 0;
  
  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${modeColors[feedback.mode]}`} />
          <h3 className="text-lg font-semibold text-zinc-900">{modeLabels[feedback.mode]}</h3>
        </div>
        <div className="text-center py-8 text-zinc-500">
          <p>No feedback data yet.</p>
          <p className="text-sm mt-1">Generate content in this mode to start collecting feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${modeColors[feedback.mode]}`} />
          <h3 className="text-lg font-semibold text-zinc-900">{modeLabels[feedback.mode]}</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span>{feedback.generation_count} generations</span>
          <span>•</span>
          <span>Updated {new Date(feedback.last_updated).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Quality Scores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ScoreBar 
          label="Formatting" 
          score={content.scores?.formatting || 0} 
          trend={content.scoreTrends?.formatting} 
        />
        <ScoreBar 
          label="Pedagogy" 
          score={content.scores?.pedagogy || 0} 
          trend={content.scoreTrends?.pedagogy} 
        />
        <ScoreBar 
          label="Clarity" 
          score={content.scores?.clarity || 0} 
          trend={content.scoreTrends?.clarity} 
        />
        <ScoreBar 
          label="Structure" 
          score={content.scores?.structure || 0} 
          trend={content.scoreTrends?.structure} 
        />
        <ScoreBar 
          label="Consistency" 
          score={content.scores?.consistency || 0} 
          trend={content.scoreTrends?.consistency} 
        />
        <ScoreBar 
          label="Factual Accuracy" 
          score={content.scores?.factualAccuracy || 0} 
          trend={content.scoreTrends?.factualAccuracy} 
        />
      </div>

      {/* Overall Assessment */}
      {content.overallAssessment && (
        <div className="bg-zinc-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-zinc-600">{content.overallAssessment}</p>
        </div>
      )}

      {/* Issues */}
      {content.issuesClusters && content.issuesClusters.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-zinc-700 mb-3">
            Top Issues ({content.issuesClusters.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {content.issuesClusters.slice(0, 10).map((issue, idx) => (
              <div 
                key={idx} 
                className="border border-zinc-200 rounded-lg p-3 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${severityColors[issue.severity]}`}>
                    {severityIcons[issue.severity]}
                    {issue.severity}
                  </span>
                  <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                    {issue.agent}
                  </span>
                  <span className="text-xs text-zinc-500">
                    ×{issue.frequency}
                  </span>
                </div>
                <p className="text-sm text-zinc-700 mt-2">{issue.description}</p>
                {issue.suggestedFix && (
                  <p className="text-xs text-blue-600 mt-1">
                    💡 {issue.suggestedFix}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {content.strengths && content.strengths.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-zinc-700 mb-2">Strengths</h4>
          <div className="flex flex-wrap gap-2">
            {content.strengths.map((strength, idx) => (
              <span 
                key={idx}
                className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full"
              >
                <CheckCircle2 className="w-3 h-3" />
                {strength}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-zinc-100">
        {showConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600">Clear and archive this feedback?</span>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClear(feedback.mode);
                setShowConfirm(false);
              }}
              disabled={isClearing}
              className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
            >
              {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 text-sm border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Acknowledge & Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default function PromptFeedbackPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading, profile } = useAuth();
  const [feedback, setFeedback] = useState<CumulativeFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clearingMode, setClearingMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  // Fetch feedback
  useEffect(() => {
    async function fetchFeedback() {
      try {
        const supabase = getUntypedSupabase();
        const { data, error } = await supabase
          .from('meta_feedback')
          .select('*')
          .order('mode');

        if (error) throw error;
        setFeedback(data || []);
      } catch (err: any) {
        console.error('Error fetching feedback:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (isAdmin) {
      fetchFeedback();

      // Set up realtime subscription
      const supabase = getUntypedSupabase();
      const channel = supabase
        .channel('meta_feedback_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'meta_feedback' },
          () => {
            fetchFeedback();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  // Handle clear feedback
  const handleClear = async (mode: string) => {
    setClearingMode(mode);
    setError(null);

    try {
      const response = await fetch('/api/admin/clear-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, userId: profile?.id })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to clear feedback');
      }

      // Refresh feedback
      const supabase = getUntypedSupabase();
      const { data } = await supabase
        .from('meta_feedback')
        .select('*')
        .order('mode');
      setFeedback(data || []);
    } catch (err: any) {
      console.error('Error clearing feedback:', err);
      setError(err.message);
    } finally {
      setClearingMode(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const totalIssues = feedback.reduce((sum, f) => {
    return sum + (f.feedback_content?.issuesClusters?.length || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Prompt Feedback</h1>
          <p className="text-zinc-600 mt-1">
            Cumulative quality analysis from {feedback.reduce((sum, f) => sum + f.generation_count, 0)} generations
          </p>
          {totalIssues > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
              <AlertTriangle className="w-4 h-4" />
              {totalIssues} issue{totalIssues !== 1 ? 's' : ''} detected
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Feedback Cards */}
        <div className="grid gap-6">
          {feedback.map((f) => (
            <FeedbackCard 
              key={f.id} 
              feedback={f} 
              onClear={handleClear}
              isClearing={clearingMode === f.mode}
            />
          ))}
        </div>

        {/* Empty state */}
        {feedback.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200">
            <p className="text-zinc-500">No feedback data available yet.</p>
            <p className="text-sm text-zinc-400 mt-1">
              Generate some content to start collecting meta-quality feedback.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
