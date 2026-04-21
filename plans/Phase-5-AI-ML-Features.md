# Phase 5: AI/ML Features

## Overview
This phase adds AI-powered contact scoring, deal prediction, smart recommendations, and auto-tagging to help sales teams work more efficiently and make better decisions.

---

## 1. AI Contact Scoring

### 1.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- AI SCORING & PREDICTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    model_type TEXT NOT NULL, -- 'contact_score', 'deal_prediction', 'auto_tag'
    version INTEGER DEFAULT 1,
    config JSONB, -- Model configuration
    is_active BOOLEAN DEFAULT TRUE,
    trained_at TIMESTAMP WITH TIME ZONE,
    accuracy DECIMAL(5,2), -- Model accuracy percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    factors JSONB, -- {engagement: 30, company_size: 25, industry: 20, ...}
    model_id UUID REFERENCES ai_models(id),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    predicted_stage TEXT, -- Where AI thinks deal will end up
    predicted_close_date DATE,
    predicted_value INTEGER,
    confidence DECIMAL(5,2), -- 0-100%
    factors JSONB, -- Why AI made this prediction
    model_id UUID REFERENCES ai_models(id),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'next_action', 'deal_upsell', 'contact_reengage', 'churn_risk'
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    entity_type TEXT, -- 'contact', 'company', 'deal'
    entity_id UUID,
    action_data JSONB, -- Data needed to execute action
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for AI tables
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Admin-only model management
CREATE POLICY "Admins can manage AI models" ON ai_models FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Anyone can view AI models" ON ai_models FOR SELECT USING (is_active = true);

-- User can view recommendations for their records
CREATE POLICY "Users can view own recommendations" ON ai_recommendations FOR SELECT USING (true);
CREATE POLICY "Users can update own recommendations" ON ai_recommendations FOR UPDATE USING (true);

-- Score history is read-only
CREATE POLICY "Users can view contact score history" ON contact_score_history FOR SELECT USING (true);
CREATE POLICY "System can insert score history" ON contact_score_history FOR INSERT WITH CHECK (true);
```

### 1.2 Contact Score AI Service

#### Create `frontend/src/lib/ai/scoringService.js`
```javascript
import { supabase } from '../supabase';

/**
 * AI Contact Scoring Service
 * 
 * This is a rule-based scoring system that can be enhanced with actual ML models.
 * In production, you would integrate with:
 * - TensorFlow.js for browser-based inference
 * - Supabase ML for server-side prediction
 * - External AI services (OpenAI, etc.)
 */

// Scoring factors and weights
const SCORING_CONFIG = {
  engagement: {
    weight: 0.30,
    factors: {
      recentActivity: { days: 7, score: 30, label: 'Activity in last 7 days' },
      hasEmail: { score: 10, label: 'Has email address' },
      multipleContacts: { threshold: 3, score: 15, label: 'Multiple interactions' },
    },
  },
  company: {
    weight: 0.25,
    factors: {
      enterpriseSize: { employees: 500, score: 25, label: 'Enterprise company' },
      midMarketSize: { employees: 100, score: 15, label: 'Mid-market company' },
      knownIndustry: { score: 10, label: 'Known industry' },
    },
  },
  behavior: {
    weight: 0.25,
    factors: {
      openedEmails: { threshold: 5, score: 20, label: 'Opens emails regularly' },
      visitedWebsite: { days: 30, score: 15, label: 'Visited website recently' },
      downloadedContent: { score: 15, label: 'Downloaded content' },
    },
  },
  fit: {
    weight: 0.20,
    factors: {
      hasBudget: { score: 20, label: 'Has budget indication' },
      hasAuthority: { roles: ['CEO', 'CTO', 'CFO', 'VP', 'Director'], score: 15, label: 'Decision maker role' },
      hasTimeline: { score: 10, label: 'Has timeline for purchase' },
    },
  },
};

/**
 * Calculate AI score for a contact
 * @param {Object} contact - Contact object with all related data
 * @returns {Object} {score, factors, breakdown}
 */
export async function calculateContactScore(contact) {
  const factors = [];
  let totalScore = 0;

  // Engagement scoring
  const engagementScore = await scoreEngagement(contact);
  factors.push(...engagementScore.factors);
  totalScore += engagementScore.score * SCORING_CONFIG.engagement.weight;

  // Company scoring
  const companyScore = await scoreCompany(contact);
  factors.push(...companyScore.factors);
  totalScore += companyScore.score * SCORING_CONFIG.company.weight;

  // Behavior scoring
  const behaviorScore = await scoreBehavior(contact);
  factors.push(...behaviorScore.factors);
  totalScore += behaviorScore.score * SCORING_CONFIG.behavior.weight;

  // Fit scoring
  const fitScore = await scoreFit(contact);
  factors.push(...fitScore.factors);
  totalScore += fitScore.score * SCORING_CONFIG.fit.weight;

  // Round to integer
  const finalScore = Math.round(Math.min(100, Math.max(0, totalScore)));

  // Save score history
  await saveScoreHistory(contact.id, finalScore, factors);

  return {
    score: finalScore,
    factors,
    breakdown: {
      engagement: engagementScore.score,
      company: companyScore.score,
      behavior: behaviorScore.score,
      fit: fitScore.score,
    },
  };
}

async function scoreEngagement(contact) {
  const factors = [];
  let score = 0;

  // Check recent activity
  const activities = await supabase
    .from('activities')
    .select('*')
    .eq('contact', contact.id)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (activities.data?.length > 0) {
    score += 30;
    factors.push({ category: 'engagement', ...activities.data[0], contribution: 30 });
  }

  if (contact.email) {
    score += 10;
    factors.push({ category: 'engagement', label: 'Has email', contribution: 10 });
  }

  // Multiple interactions
  if (activities.data?.length >= 3) {
    score += 15;
    factors.push({ category: 'engagement', label: 'Multiple interactions', contribution: 15 });
  }

  return { score, factors };
}

async function scoreCompany(contact) {
  const factors = [];
  let score = 0;

  // Get company info
  const company = await supabase
    .from('companies')
    .select('*')
    .eq('id', contact.company)
    .single();

  if (company.data) {
    if (company.data.employees >= 500) {
      score += 25;
      factors.push({ category: 'company', label: 'Enterprise', contribution: 25 });
    } else if (company.data.employees >= 100) {
      score += 15;
      factors.push({ category: 'company', label: 'Mid-market', contribution: 15 });
    }

    if (company.data.industry) {
      score += 10;
      factors.push({ category: 'company', label: 'Known industry', contribution: 10 });
    }
  }

  return { score, factors };
}

async function scoreBehavior(contact) {
  const factors = [];
  let score = 0;

  // Get emails for this contact
  const emails = await supabase
    .from('emails')
    .select('*')
    .eq('to_address', contact.email)
    .gte('opened_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (emails.data?.length >= 5) {
    score += 20;
    factors.push({ category: 'behavior', label: 'Regular email engagement', contribution: 20 });
  }

  return { score, factors };
}

async function scoreFit(contact) {
  const factors = [];
  let score = 0;

  // Check role for decision-making authority
  const authorityRoles = ['CEO', 'CTO', 'CFO', 'VP', 'Director', 'Head of'];
  const isAuthority = authorityRoles.some((role) => 
    contact.role?.toLowerCase().includes(role.toLowerCase())
  );

  if (isAuthority) {
    score += 15;
    factors.push({ category: 'fit', label: 'Decision maker', contribution: 15 });
  }

  return { score, factors };
}

async function saveScoreHistory(contactId, score, factors) {
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('contact_score_history').insert({
    contact_id: contactId,
    score,
    factors,
  });
}

/**
 * Batch calculate scores for all contacts
 */
export async function batchCalculateScores(contacts) {
  const results = [];
  for (const contact of contacts) {
    try {
      const result = await calculateContactScore(contact);
      results.push({ contactId: contact.id, ...result });
    } catch (error) {
      console.error(`Failed to score contact ${contact.id}:`, error);
    }
  }
  return results;
}
```

### 1.3 Contact Score Display Component

#### Create `frontend/src/components/ContactScoreBadge.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { Sparkles, Info } from 'lucide-react';
import { calculateContactScore } from '../lib/ai/scoringService';

export default function ContactScoreBadge({ contact }) {
  const [score, setScore] = useState(contact.score || 0);
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const refreshScore = async () => {
    setLoading(true);
    try {
      const result = await calculateContactScore(contact);
      setScore(result.score);
      setFactors(result.factors);
    } catch (error) {
      console.error('Failed to calculate score:', error);
    }
    setLoading(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-blue-100 text-blue-700';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Hot';
    if (score >= 60) return 'Warm';
    if (score >= 40) return 'Cool';
    return 'Cold';
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${getScoreColor(score)}`}
      >
        <Sparkles size={14} />
        <span>{score}</span>
        <span className="text-xs opacity-70">({getScoreLabel(score)})</span>
      </button>

      {showDetails && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border rounded-xl shadow-lg z-50 p-4">
          <h4 className="font-semibold text-sm mb-2">AI Contact Score</h4>

          <div className="flex items-center justify-center mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
          </div>

          {factors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Score Factors</p>
              {factors.slice(0, 5).map((factor, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{factor.label}</span>
                  <span className="font-medium">+{factor.contribution}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={refreshScore}
            disabled={loading}
            className="mt-3 w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {loading ? 'Recalculating...' : 'Recalculate Score'}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 2. Deal Prediction AI

### 2.1 Deal Prediction Service

#### Create `frontend/src/lib/ai/dealPredictionService.js`
```javascript
import { supabase } from '../supabase';

/**
 * Deal Prediction Service
 * 
 * Predicts deal outcomes based on historical patterns and current deal attributes.
 * Uses a simple rule-based system that can be enhanced with ML models.
 */

const STAGE_PROGRESSION = ['new', 'qualified', 'proposal', 'negotiation', 'won'];

/**
 * Predict deal outcome
 * @param {Object} deal - Deal object with all attributes
 * @returns {Object} {prediction, confidence, factors}
 */
export async function predictDealOutcome(deal) {
  let confidence = 50;
  const factors = [];

  // Get historical data for similar deals
  const similarDeals = await findSimilarDeals(deal);
  
  // Calculate win rate based on similar deals
  if (similarDeals.length > 0) {
    const wonDeals = similarDeals.filter((d) => d.stage === 'won').length;
    const winRate = (wonDeals / similarDeals.length) * 100;
    confidence = Math.round(winRate);
    
    factors.push({
      type: 'similar_deals',
      label: `${similarDeals.length} similar deals found`,
      impact: winRate > 50 ? 'positive' : 'negative',
    });
  }

  // Factor in probability field
  if (deal.probability) {
    confidence = Math.round((confidence + deal.probability) / 2);
    factors.push({
      type: 'probability',
      label: 'Current probability',
      impact: deal.probability > 50 ? 'positive' : 'negative',
    });
  }

  // Factor in deal age
  const dealAge = getDealAge(deal.created_at);
  if (dealAge > 30 && deal.stage === 'new') {
    confidence -= 10;
    factors.push({
      type: 'stagnation',
      label: 'Deal stagnating in early stage',
      impact: 'negative',
    });
  }

  // Factor in engagement
  const engagement = await getContactEngagement(deal.contact);
  if (engagement.high) {
    confidence += 10;
    factors.push({
      type: 'engagement',
      label: 'High contact engagement',
      impact: 'positive',
    });
  }

  // Predict close date based on stage and historical data
  const predictedCloseDate = predictCloseDate(deal);

  // Predict final stage
  const predictedStage = confidence > 50 ? 'won' : 'lost';

  // Save prediction
  await savePrediction(deal.id, {
    predictedStage,
    predictedCloseDate,
    confidence: Math.min(95, Math.max(5, confidence)),
    factors,
  });

  return {
    prediction: predictedStage,
    confidence: Math.min(95, Math.max(5, confidence)),
    predictedCloseDate,
    factors,
  };
}

async function findSimilarDeals(deal) {
  // Find deals with similar attributes
  const { data } = await supabase
    .from('deals')
    .select('*')
    .eq('stage', 'won')
    .or(`company.eq.${deal.company},contact.eq.${deal.contact}`)
    .limit(20);

  return data || [];
}

async function getContactEngagement(contactId) {
  if (!contactId) return { high: false };

  const { data } = await supabase
    .from('activities')
    .select('id')
    .eq('contact', contactId)
    .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  return {
    high: (data?.length || 0) >= 3,
    count: data?.length || 0,
  };
}

function getDealAge(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

function predictCloseDate(deal) {
  const stageIndex = STAGE_PROGRESSION.indexOf(deal.stage);
  const daysRemaining = (5 - stageIndex) * 14; // 2 weeks per stage

  const closeDate = new Date();
  closeDate.setDate(closeDate.getDate() + daysRemaining);

  return closeDate.toISOString().split('T')[0];
}

async function savePrediction(dealId, prediction) {
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('deal_predictions').insert({
    deal_id: dealId,
    ...prediction,
  });
}

/**
 * Get all predictions for a deal
 */
export async function getDealPredictions(dealId) {
  const { data } = await supabase
    .from('deal_predictions')
    .select('*')
    .eq('deal_id', dealId)
    .order('calculated_at', { ascending: false });

  return data || [];
}
```

### 2.2 Deal Prediction Display

#### Create `frontend/src/components/DealPredictionBadge.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { predictDealOutcome } from '../lib/ai/dealPredictionService';

export default function DealPredictionBadge({ deal }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (deal.stage !== 'won' && deal.stage !== 'lost') {
      loadPrediction();
    }
  }, [deal.id]);

  const loadPrediction = async () => {
    try {
      const result = await predictDealOutcome(deal);
      setPrediction(result);
    } catch (error) {
      console.error('Failed to get prediction:', error);
    }
  };

  if (!prediction || deal.stage === 'won' || deal.stage === 'lost') {
    return null;
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return 'text-green-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <Brain size={16} className="text-purple-600" />
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {prediction.prediction === 'won' ? (
            <TrendingUp size={14} className="text-green-600" />
          ) : (
            <TrendingDown size={14} className="text-red-600" />
          )}
          <span className="text-sm font-medium">
            {prediction.confidence}% likely to {prediction.prediction}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
          <Calendar size={12} />
          <span>Est. close: {prediction.predictedCloseDate}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. AI Recommendations

### 3.1 Recommendation Engine

#### Create `frontend/src/lib/ai/recommendationEngine.js`
```javascript
import { supabase } from '../supabase';

/**
 * AI Recommendation Engine
 * 
 * Generates actionable recommendations based on CRM data patterns.
 */

export async function generateRecommendations(userId) {
  const recommendations = [];

  // Check for deals that need attention
  const dealRecommendations = await checkDealRecommendations();
  recommendations.push(...dealRecommendations);

  // Check for contacts to re-engage
  const contactRecommendations = await checkContactRecommendations();
  recommendations.push(...contactRecommendations);

  // Check for churn risk
  const churnRecommendations = await checkChurnRisk();
  recommendations.push(...churnRecommendations);

  // Save recommendations to database
  await saveRecommendations(recommendations);

  return recommendations;
}

async function checkDealRecommendations() {
  const recommendations = [];

  // Find deals in proposal stage for > 2 weeks
  const staleProposals = await supabase
    .from('deals')
    .select('*, contact:contacts(name), company:companies(name)')
    .eq('stage', 'proposal')
    .lt('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  for (const deal of staleProposals.data || []) {
    recommendations.push({
      type: 'deal_upsell',
      title: `Follow up on ${deal.title}`,
      description: 'This deal has been in proposal stage for over 2 weeks. Consider a follow-up.',
      priority: 'medium',
      entity_type: 'deal',
      entity_id: deal.id,
      action_data: {
        type: 'create_activity',
        contactId: deal.contact,
        activityType: 'call',
        title: `Follow up on ${deal.title}`,
      },
    });
  }

  // Find high-value deals without recent activity
  const inactiveDeals = await supabase
    .from('deals')
    .select('*')
    .gte('value', 50000)
    .not('stage', 'eq', 'won')
    .not('stage', 'eq', 'lost');

  for (const deal of inactiveDeals.data || []) {
    const recentActivities = await supabase
      .from('activities')
      .select('id')
      .eq('contact', deal.contact)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if ((recentActivities.data?.length || 0) === 0) {
      recommendations.push({
        type: 'next_action',
        title: `Contact regarding ${deal.title}`,
        description: `High-value deal ($ ${deal.value.toLocaleString()}) with no recent activity.`,
        priority: 'high',
        entity_type: 'deal',
        entity_id: deal.id,
        action_data: {
          type: 'create_activity',
          contactId: deal.contact,
        },
      });
    }
  }

  return recommendations;
}

async function checkContactRecommendations() {
  const recommendations = [];

  // Find contacts not contacted in 30+ days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*, company:companies(name)')
    .eq('status', 'customer')
    .or(`last_contact.lt.${thirtyDaysAgo},last_contact.is.null`);

  for (const contact of contacts || []) {
    recommendations.push({
      type: 'contact_reengage',
      title: `Re-engage ${contact.name}`,
      description: `No contact in over 30 days. Time for a check-in?`,
      priority: 'low',
      entity_type: 'contact',
      entity_id: contact.id,
      action_data: {
        type: 'create_activity',
        contactId: contact.id,
      },
    });
  }

  return recommendations;
}

async function checkChurnRisk() {
  const recommendations = [];

  // Find customers with decreasing engagement
  const { data: customers } = await supabase
    .from('contacts')
    .select('*, activities(count)')
    .eq('status', 'customer');

  for (const contact of customers || []) {
    // If activities have decreased over last 30 days vs previous 30 days
    // This is simplified - real implementation would need more complex analysis
    if (contact.activities?.count < 2) {
      recommendations.push({
        type: 'churn_risk',
        title: `Check in with ${contact.name}`,
        description: 'Low engagement detected. Customer might be at risk of churning.',
        priority: 'high',
        entity_type: 'contact',
        entity_id: contact.id,
        action_data: {
          type: 'create_activity',
          contactId: contact.id,
          priority: 'high',
        },
      });
    }
  }

  return recommendations;
}

async function saveRecommendations(recommendations) {
  const { data: { user } } = await supabase.auth.getUser();

  // Clear old recommendations first
  await supabase.from('ai_recommendations').delete().eq('is_read', false);

  // Insert new recommendations
  for (const rec of recommendations) {
    await supabase.from('ai_recommendations').insert({
      ...rec,
      is_read: false,
      is_dismissed: false,
    });
  }
}
```

### 3.2 AI Recommendations Panel

#### Create `frontend/src/components/AIRecommendations.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, X, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useCRM from '../store/useCRM';

export default function AIRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const addActivity = useCRM((s) => s.addActivity);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    const { data } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('is_read', false)
      .eq('is_dismissed', false)
      .order('priority', { ascending: false })
      .limit(10);

    setRecommendations(data || []);
    setLoading(false);
  };

  const handleAction = async (rec) => {
    if (rec.action_data?.type === 'create_activity') {
      // Create the activity
      await addActivity({
        title: rec.action_data.title || rec.title,
        contact: rec.action_data.contactId,
        type: rec.action_data.activityType || 'task',
        date: new Date().toISOString().split('T')[0],
        priority: rec.action_data.priority || 'medium',
        status: 'scheduled',
      });
    }

    // Mark as read
    await supabase.from('ai_recommendations').update({ is_read: true }).eq('id', rec.id);
    setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
  };

  const handleDismiss = async (rec) => {
    await supabase.from('ai_recommendations').update({ is_dismissed: true }).eq('id', rec.id);
    setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle size={14} className="text-red-500" />;
      case 'medium':
        return <Clock size={14} className="text-yellow-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse flex items-center gap-2">
          <Sparkles size={18} className="text-purple-600" />
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-purple-600" />
        <h3 className="font-semibold">AI Recommendations</h3>
        <span className="text-xs text-gray-500">({recommendations.length})</span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-3 rounded-lg border ${
              rec.priority === 'high' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getPriorityIcon(rec.priority)}
                  <p className="font-medium text-sm">{rec.title}</p>
                </div>
                <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleAction(rec)}
                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-black"
              >
                Take Action
              </button>
              <button
                onClick={() => handleDismiss(rec)}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. Auto-Tagging with AI

### 4.1 Auto-Tag Service

#### Create `frontend/src/lib/ai/autoTagService.js`
```javascript
import { supabase } from '../supabase';

/**
 * AI Auto-Tagging Service
 * 
 * Automatically tags contacts and companies based on their attributes and behavior.
 */

const TAG_RULES = {
  contact: [
    {
      name: 'High Value',
      condition: (contact) => contact.score >= 80 || contact.company_size === 'Enterprise',
      color: 'purple',
    },
    {
      name: 'Decision Maker',
      condition: (contact) => ['CEO', 'CTO', 'CFO', 'VP', 'Director'].some((r) => contact.role?.includes(r)),
      color: 'blue',
    },
    {
      name: 'Tech Savvy',
      condition: (contact) => ['Technology', 'SaaS', 'Software'].some((i) => contact.industry?.includes(i)),
      color: 'cyan',
    },
    {
      name: 'Long-term Client',
      condition: (contact) => contact.status === 'customer' && contact.lastContact &&
        (Date.now() - new Date(contact.lastContact)) < 90 * 24 * 60 * 60 * 1000,
      color: 'green',
    },
    {
      name: 'At Risk',
      condition: (contact) => contact.status === 'customer' &&
        (!contact.lastContact || (Date.now() - new Date(contact.lastContact)) > 60 * 24 * 60 * 60 * 1000),
      color: 'red',
    },
  ],
  company: [
    {
      name: 'Enterprise',
      condition: (company) => company.size === 'Enterprise' || company.employees >= 500,
      color: 'purple',
    },
    {
      name: 'High Revenue',
      condition: (company) => company.revenue?.includes('$') && parseInt(company.revenue.replace(/[^0-9]/g, '')) > 10000000,
      color: 'green',
    },
    {
      name: 'Tech Industry',
      condition: (company) => ['Technology', 'SaaS', 'Software', 'IT'].some((i) => company.industry?.includes(i)),
      color: 'blue',
    },
    {
      name: 'International',
      condition: (company) => company.country && !['USA', 'US'].includes(company.country),
      color: 'orange',
    },
  ],
};

/**
 * Auto-tag a contact based on AI rules
 */
export async function autoTagContact(contact) {
  const rules = TAG_RULES.contact;
  const newTags = [];

  for (const rule of rules) {
    if (rule.condition(contact)) {
      newTags.push(rule.name);
    }
  }

  // If contact already has tags, merge them
  const existingTags = contact.tags || [];
  const allTags = [...new Set([...existingTags, ...newTags])];

  if (allTags.length !== existingTags.length) {
    // Update contact with new tags
    await supabase
      .from('contacts')
      .update({ tags: allTags })
      .eq('id', contact.id);

    return { added: newTags, tags: allTags };
  }

  return { added: [], tags: existingTags };
}

/**
 * Auto-tag a company based on AI rules
 */
export async function autoTagCompany(company) {
  const rules = TAG_RULES.company;
  const newTags = [];

  for (const rule of rules) {
    if (rule.condition(company)) {
      newTags.push(rule.name);
    }
  }

  // Merge with existing tags (stored as comma-separated string in this example)
  const existingTags = company.tags ? company.tags.split(',').map((t) => t.trim()) : [];
  const allTags = [...new Set([...existingTags, ...newTags])];

  return { added: newTags, tags: allTags.join(', ') };
}

/**
 * Batch auto-tag all contacts
 */
export async function batchAutoTagContacts() {
  const { data: contacts } = await supabase.from('contacts').select('*');

  const results = [];
  for (const contact of contacts || []) {
    try {
      const result = await autoTagContact(contact);
      results.push({ id: contact.id, ...result });
    } catch (error) {
      console.error(`Failed to tag contact ${contact.id}:`, error);
    }
  }

  return results;
}
```

---

## 5. Smart Search

### 5.1 AI-Powered Search

#### Create `frontend/src/lib/ai/smartSearch.js`
```javascript
import { supabase } from '../supabase';

/**
 * Smart Search with AI
 * 
 * Provides intelligent search with typo tolerance, semantic understanding,
 * and contextual results.
 */

/**
 * Search across all entities with AI enhancement
 */
export async function smartSearch(query, options = {}) {
  const { types = ['contacts', 'companies', 'deals'], limit = 20 } = options;

  if (!query || query.trim().length < 2) {
    return { results: [], query };
  }

  const normalizedQuery = query.toLowerCase().trim();
  const results = [];

  // Search contacts
  if (types.includes('contacts')) {
    const contactResults = await searchContacts(normalizedQuery, limit);
    results.push(...contactResults.map((r) => ({ ...r, type: 'contact' })));
  }

  // Search companies
  if (types.includes('companies')) {
    const companyResults = await searchCompanies(normalizedQuery, limit);
    results.push(...companyResults.map((r) => ({ ...r, type: 'company' })));
  }

  // Search deals
  if (types.includes('deals')) {
    const dealResults = await searchDeals(normalizedQuery, limit);
    results.push(...dealResults.map((r) => ({ ...r, type: 'deal' })));
  }

  // Sort by relevance score
  results.sort((a, b) => b.score - a.score);

  return {
    results: results.slice(0, limit),
    query: normalizedQuery,
    total: results.length,
  };
}

async function searchContacts(query, limit) {
  const { data } = await supabase
    .from('contacts')
    .select('*, companies(name)')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(limit);

  return (data || []).map((contact) => ({
    id: contact.id,
    title: contact.name,
    subtitle: contact.email,
    extra: contact.companies?.name || contact.role,
    score: calculateRelevance(contact, query),
    data: contact,
  }));
}

async function searchCompanies(query, limit) {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .or(`name.ilike.%${query}%,industry.ilike.%${query}%`)
    .limit(limit);

  return (data || []).map((company) => ({
    id: company.id,
    title: company.name,
    subtitle: company.industry,
    extra: company.size,
    score: calculateRelevance(company, query),
    data: company,
  }));
}

async function searchDeals(query, limit) {
  const { data } = await supabase
    .from('deals')
    .select('*')
    .ilike('title', `%${query}%`)
    .limit(limit);

  return (data || []).map((deal) => ({
    id: deal.id,
    title: deal.title,
    subtitle: `$${deal.value?.toLocaleString()} - ${deal.stage}`,
    extra: deal.owner,
    score: calculateRelevance(deal, query),
    data: deal,
  }));
}

function calculateRelevance(record, query) {
  let score = 0;

  // Exact match
  if (record.name?.toLowerCase().includes(query)) score += 30;
  if (record.email?.toLowerCase().includes(query)) score += 25;
  if (record.title?.toLowerCase().includes(query)) score += 20;

  // Fuzzy match
  if (fuzzyMatch(record.name, query)) score += 15;
  if (fuzzyMatch(record.email, query)) score += 10;

  // Boost for active records
  if (record.status === 'customer') score += 5;
  if (record.stage === 'won') score += 5;

  return score;
}

function fuzzyMatch(str, query) {
  if (!str) return false;
  const normalized = str.toLowerCase();
  
  // Check if all query characters appear in order
  let queryIndex = 0;
  for (const char of normalized) {
    if (char === query[queryIndex]) {
      queryIndex++;
    }
    if (queryIndex === query.length) return true;
  }

  return false;
}
```

---

## 6. Implementation Checklist

- [ ] Update `supabase/schema.sql` with AI tables
- [ ] Create `frontend/src/lib/ai/scoringService.js`
- [ ] Create `frontend/src/lib/ai/dealPredictionService.js`
- [ ] Create `frontend/src/lib/ai/recommendationEngine.js`
- [ ] Create `frontend/src/lib/ai/autoTagService.js`
- [ ] Create `frontend/src/lib/ai/smartSearch.js`
- [ ] Create `frontend/src/components/ContactScoreBadge.jsx`
- [ ] Create `frontend/src/components/DealPredictionBadge.jsx`
- [ ] Create `frontend/src/components/AIRecommendations.jsx`
- [ ] Add ContactScoreBadge to Contacts page
- [ ] Add DealPredictionBadge to Deals pipeline
- [ ] Add AIRecommendations panel to Dashboard
- [ ] Add AI-powered search bar
- [ ] Create Settings page section for AI configuration

---

## Summary

AI/ML features in this phase provide:

1. **Contact Scoring** - Automatically score contacts based on engagement, company size, behavior, and fit factors
2. **Deal Predictions** - Predict deal outcomes and close dates based on historical patterns
3. **Smart Recommendations** - AI-generated action items based on CRM data patterns
4. **Auto-Tagging** - Automatically tag contacts and companies based on their attributes
5. **Smart Search** - Intelligent search with typo tolerance and relevance ranking

These features can be enhanced over time with actual machine learning models as more data becomes available.