# Feature 30: Educational Content

## Overview
Comprehensive knowledge base and tutorial system covering CS2 skin trading, investing, pattern identification, float values, sticker crafting, and market analysis. Includes written guides, video tutorials, interactive calculators, and community Q&A. Essential for onboarding new users and establishing platform authority.

## User Segments
- **Primary**: Casual Traders, Hobbyists
- **Secondary**: Investors, Collectors
- **Tertiary**: Content Creators

## User Stories

### As a Beginner
- I want to learn the basics of CS2 skin trading
- I want to understand what float values are and why they matter
- I want to know how to identify valuable patterns (blue gems, etc.)
- I want tutorials on using the site's features
- I want to ask questions and get answers from the community

### As an Investor
- I want advanced guides on investment strategies
- I want to learn about market cycles and timing
- I want case studies of successful investments
- I want to understand sticker value retention
- I want tax reporting guidance

### As a Collector
- I want guides on identifying rare patterns
- I want to learn about sticker history (Katowice 2014, etc.)
- I want crafting guides (how to create themed loadouts)
- I want preservation tips (how to maintain skin value)

### As the Platform
- I want to rank high in Google search for CS2 trading keywords
- I want to reduce support tickets with self-service guides
- I want to establish authority in CS2 trading space
- I want to capture long-tail SEO traffic

## Research & Context

### Educational Content Types

1. **Written Guides**
   - Beginner guides (What are CS2 skins?)
   - Trading guides (How to spot scams)
   - Technical guides (Understanding float values)
   - Investment guides (Sticker value retention)

2. **Video Tutorials**
   - Platform walkthroughs
   - Live trading sessions
   - Pattern identification tutorials
   - Craft showcase videos

3. **Interactive Tools**
   - ROI calculator
   - Float value converter
   - Sticker % calculator
   - Trade-up contract calculator

4. **Community Q&A**
   - Forum-style discussions
   - Voting system (Reddit-style)
   - Expert-verified answers
   - Search functionality

### Content Structure (SEO-Optimized)

**URL Pattern**: `/learn/category/guide-slug`
- `/learn/basics/what-are-cs2-skins`
- `/learn/trading/identifying-blue-gems`
- `/learn/investing/sticker-value-guide`
- `/learn/crafting/themed-loadout-guide`

### Competitor Analysis
- **Medium/Substack**: Long-form written content
- **YouTube**: Video tutorials (most popular for CS2)
- **Reddit**: Community Q&A
- **CS2 Guides Sites**: Outdated, poor SEO
- **Opportunity**: Modern, SEO-optimized, interactive educational platform

## Technical Requirements

### Database Schema

```sql
-- Educational content articles/guides
CREATE TABLE educational_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content metadata
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL, -- URL-friendly
  category VARCHAR(100) NOT NULL, -- 'basics', 'trading', 'investing', 'crafting', 'technical'
  subcategory VARCHAR(100),
  difficulty_level VARCHAR(50) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced', 'expert'

  -- Content
  summary TEXT NOT NULL, -- Short description for SEO
  content TEXT NOT NULL, -- Markdown or HTML
  featured_image_url TEXT,

  -- Author
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_official BOOLEAN DEFAULT false, -- Official platform content vs community

  -- SEO
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  meta_keywords VARCHAR(255)[],

  -- Engagement
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0, -- "Was this helpful?" votes
  unhelpful_count INTEGER DEFAULT 0,

  -- Status
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Related content
  related_content_ids UUID[],

  INDEX idx_educational_content_slug (slug),
  INDEX idx_educational_content_category (category, difficulty_level),
  INDEX idx_educational_content_published (is_published, published_at DESC),
  INDEX idx_educational_content_popular (helpful_count DESC, view_count DESC)
);

-- Q&A questions
CREATE TABLE qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Question
  title VARCHAR(500) NOT NULL,
  question_text TEXT NOT NULL,
  tags VARCHAR(100)[], -- ['trading', 'blue_gem', 'case_hardened']

  -- Status
  is_answered BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Verified by experts/moderators

  -- Engagement
  view_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  answer_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_qa_questions_user_id (user_id),
  INDEX idx_qa_questions_tags (tags),
  INDEX idx_qa_questions_popular (upvote_count DESC, answer_count DESC),
  INDEX idx_qa_questions_unanswered (is_answered) WHERE is_answered = false
);

-- Q&A answers
CREATE TABLE qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Answer
  answer_text TEXT NOT NULL,

  -- Status
  is_accepted BOOLEAN DEFAULT false, -- Accepted by question asker
  is_verified BOOLEAN DEFAULT false, -- Verified by experts

  -- Engagement
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_qa_answers_question_id (question_id, created_at DESC),
  INDEX idx_qa_answers_user_id (user_id),
  INDEX idx_qa_answers_accepted (is_accepted) WHERE is_accepted = true
);

-- Q&A votes
CREATE TABLE qa_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Vote target
  vote_type VARCHAR(50) NOT NULL, -- 'question_upvote', 'question_downvote', 'answer_upvote', 'answer_downvote'
  target_id UUID NOT NULL, -- question_id or answer_id

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, vote_type, target_id),
  INDEX idx_qa_votes_user_id (user_id),
  INDEX idx_qa_votes_target (vote_type, target_id)
);

-- Interactive calculators
CREATE TABLE calculators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Calculator metadata
  calculator_name VARCHAR(255) NOT NULL,
  calculator_slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'roi', 'float', 'sticker', 'tradeup'

  -- Calculator config (JSON schema for inputs/outputs)
  input_schema JSONB NOT NULL,
  calculation_logic TEXT NOT NULL, -- JavaScript function

  -- Engagement
  usage_count INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_calculators_slug (calculator_slug),
  INDEX idx_calculators_category (category)
);

-- Content feedback (Was this helpful?)
CREATE TABLE content_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES educational_content(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  feedback_type VARCHAR(50) NOT NULL, -- 'helpful', 'unhelpful'
  feedback_comment TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_id, user_id),
  INDEX idx_content_feedback_content_id (content_id)
);
```

### Services

#### `src/services/EducationalContentService.ts`

```typescript
import { db } from '@/lib/db';
import { marked } from 'marked'; // Markdown parser

interface ArticleData {
  title: string;
  slug: string;
  category: string;
  subcategory?: string;
  difficultyLevel?: string;
  summary: string;
  content: string; // Markdown
  featuredImageUrl?: string;
  authorId?: string;
  isOfficial?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  relatedContentIds?: string[];
}

export class EducationalContentService {
  /**
   * Create educational article
   */
  async createArticle(data: ArticleData, publish: boolean = false): Promise<string> {
    const article = await db.educational_content.create({
      data: {
        title: data.title,
        slug: data.slug,
        category: data.category,
        subcategory: data.subcategory,
        difficulty_level: data.difficultyLevel || 'beginner',
        summary: data.summary,
        content: data.content,
        featured_image_url: data.featuredImageUrl,
        author_id: data.authorId,
        is_official: data.isOfficial || false,
        meta_title: data.metaTitle || data.title,
        meta_description: data.metaDescription || data.summary,
        meta_keywords: data.metaKeywords || [],
        related_content_ids: data.relatedContentIds || [],
        is_published: publish,
        published_at: publish ? new Date() : null,
      },
    });

    return article.id;
  }

  /**
   * Get article by slug
   */
  async getArticle(slug: string, viewerId?: string): Promise<any> {
    const article = await db.educational_content.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    // Increment view count
    await db.educational_content.update({
      where: { id: article.id },
      data: { view_count: { increment: 1 } },
    });

    // Parse markdown to HTML
    const contentHtml = marked(article.content);

    return {
      ...article,
      contentHtml,
    };
  }

  /**
   * Get all articles (with filters)
   */
  async getArticles(filters?: {
    category?: string;
    difficulty?: string;
    sortBy?: 'recent' | 'popular';
  }) {
    const where: any = { is_published: true };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.difficulty) {
      where.difficulty_level = filters.difficulty;
    }

    let orderBy: any = { published_at: 'desc' }; // Default: recent

    if (filters?.sortBy === 'popular') {
      orderBy = [{ helpful_count: 'desc' }, { view_count: 'desc' }];
    }

    return await db.educational_content.findMany({
      where,
      orderBy,
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });
  }

  /**
   * Submit feedback (helpful/unhelpful)
   */
  async submitFeedback(contentId: string, userId: string, feedbackType: 'helpful' | 'unhelpful', comment?: string): Promise<void> {
    // Check if user already submitted feedback
    const existing = await db.content_feedback.findFirst({
      where: {
        content_id: contentId,
        user_id: userId,
      },
    });

    if (existing) {
      throw new Error('You have already submitted feedback for this article');
    }

    // Create feedback
    await db.content_feedback.create({
      data: {
        content_id: contentId,
        user_id: userId,
        feedback_type: feedbackType,
        feedback_comment: comment,
      },
    });

    // Update article counts
    if (feedbackType === 'helpful') {
      await db.educational_content.update({
        where: { id: contentId },
        data: { helpful_count: { increment: 1 } },
      });
    } else {
      await db.educational_content.update({
        where: { id: contentId },
        data: { unhelpful_count: { increment: 1 } },
      });
    }
  }

  /**
   * Ask a question (Q&A)
   */
  async askQuestion(userId: string, title: string, questionText: string, tags: string[]): Promise<string> {
    const question = await db.qa_questions.create({
      data: {
        user_id: userId,
        title,
        question_text: questionText,
        tags,
      },
    });

    return question.id;
  }

  /**
   * Answer a question
   */
  async answerQuestion(questionId: string, userId: string, answerText: string): Promise<string> {
    const answer = await db.qa_answers.create({
      data: {
        question_id: questionId,
        user_id: userId,
        answer_text: answerText,
      },
    });

    // Increment answer count
    await db.qa_questions.update({
      where: { id: questionId },
      data: {
        answer_count: { increment: 1 },
        is_answered: true,
      },
    });

    return answer.id;
  }

  /**
   * Vote on question/answer
   */
  async vote(userId: string, voteType: 'question_upvote' | 'question_downvote' | 'answer_upvote' | 'answer_downvote', targetId: string): Promise<void> {
    // Check if user already voted
    const existing = await db.qa_votes.findFirst({
      where: {
        user_id: userId,
        vote_type: voteType,
        target_id: targetId,
      },
    });

    if (existing) {
      // Remove vote
      await db.qa_votes.delete({ where: { id: existing.id } });

      // Decrement count
      if (voteType === 'question_upvote') {
        await db.qa_questions.update({
          where: { id: targetId },
          data: { upvote_count: { decrement: 1 } },
        });
      } else if (voteType === 'question_downvote') {
        await db.qa_questions.update({
          where: { id: targetId },
          data: { downvote_count: { decrement: 1 } },
        });
      } else if (voteType === 'answer_upvote') {
        await db.qa_answers.update({
          where: { id: targetId },
          data: { upvote_count: { decrement: 1 } },
        });
      } else if (voteType === 'answer_downvote') {
        await db.qa_answers.update({
          where: { id: targetId },
          data: { downvote_count: { decrement: 1 } },
        });
      }

      return;
    }

    // Create vote
    await db.qa_votes.create({
      data: {
        user_id: userId,
        vote_type: voteType,
        target_id: targetId,
      },
    });

    // Increment count
    if (voteType === 'question_upvote') {
      await db.qa_questions.update({
        where: { id: targetId },
        data: { upvote_count: { increment: 1 } },
      });
    } else if (voteType === 'question_downvote') {
      await db.qa_questions.update({
        where: { id: targetId },
        data: { downvote_count: { increment: 1 } },
      });
    } else if (voteType === 'answer_upvote') {
      await db.qa_answers.update({
        where: { id: targetId },
        data: { upvote_count: { increment: 1 } },
      });
    } else if (voteType === 'answer_downvote') {
      await db.qa_answers.update({
        where: { id: targetId },
        data: { downvote_count: { increment: 1 } },
      });
    }
  }

  /**
   * Get questions (with filters)
   */
  async getQuestions(filters?: { tags?: string[]; sortBy?: 'recent' | 'popular' | 'unanswered' }) {
    const where: any = {};

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    let orderBy: any = { created_at: 'desc' }; // Default: recent

    if (filters?.sortBy === 'popular') {
      orderBy = [{ upvote_count: 'desc' }, { answer_count: 'desc' }];
    } else if (filters?.sortBy === 'unanswered') {
      where.is_answered = false;
    }

    return await db.qa_questions.findMany({
      where,
      orderBy,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
      take: 50,
    });
  }

  /**
   * Get question with answers
   */
  async getQuestion(questionId: string): Promise<any> {
    const question = await db.qa_questions.findUnique({
      where: { id: questionId },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Increment view count
    await db.qa_questions.update({
      where: { id: questionId },
      data: { view_count: { increment: 1 } },
    });

    // Get answers
    const answers = await db.qa_answers.findMany({
      where: { question_id: questionId },
      orderBy: [{ is_accepted: 'desc' }, { upvote_count: 'desc' }],
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return {
      ...question,
      answers,
    };
  }

  /**
   * Accept answer (by question asker)
   */
  async acceptAnswer(answerId: string, userId: string): Promise<void> {
    const answer = await db.qa_answers.findUnique({
      where: { id: answerId },
      include: { question: true },
    });

    if (!answer) {
      throw new Error('Answer not found');
    }

    // Verify user is question asker
    if (answer.question.user_id !== userId) {
      throw new Error('Only the question asker can accept an answer');
    }

    // Unaccept previous accepted answer
    await db.qa_answers.updateMany({
      where: {
        question_id: answer.question_id,
        is_accepted: true,
      },
      data: { is_accepted: false },
    });

    // Accept this answer
    await db.qa_answers.update({
      where: { id: answerId },
      data: { is_accepted: true },
    });
  }

  /**
   * Run calculator
   */
  async runCalculator(calculatorSlug: string, inputs: any): Promise<any> {
    const calculator = await db.calculators.findUnique({
      where: { calculator_slug: calculatorSlug },
    });

    if (!calculator) {
      throw new Error('Calculator not found');
    }

    // Increment usage count
    await db.calculators.update({
      where: { id: calculator.id },
      data: { usage_count: { increment: 1 } },
    });

    // Execute calculation logic (eval is dangerous - use sandboxed VM or predefined functions)
    // For now, placeholder implementation
    const result = { output: 'Calculated result' };

    return result;
  }
}

export const educationalContentService = new EducationalContentService();
```

### API Endpoints

#### `src/app/api/learn/articles/[slug]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { educationalContentService } from '@/services/EducationalContentService';

// GET /api/learn/articles/[slug] - Get article
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const article = await educationalContentService.getArticle(params.slug);
    return NextResponse.json(article);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
```

## Frontend Components

### `src/app/learn/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LearnPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchArticles();
  }, [category]);

  const fetchArticles = async () => {
    const params = category !== 'all' ? `?category=${category}` : '';
    const res = await fetch(`/api/learn/articles${params}`);
    const data = await res.json();
    setArticles(data.articles || []);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">CS2 Trading & Investing Guides</h1>

      {/* Categories */}
      <div className="flex gap-2 mb-6">
        {['all', 'basics', 'trading', 'investing', 'crafting', 'technical'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium ${category === cat ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Link key={article.id} href={`/learn/${article.category}/${article.slug}`}>
            <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
              <h3 className="font-bold text-xl mb-2">{article.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{article.summary}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{article.difficulty_level}</span>
                <span>{article.view_count} views</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

## Success Metrics
1. **SEO Traffic**: Educational content drives 40%+ of organic traffic
2. **Engagement**: Average 5+ minutes per article view
3. **Helpfulness**: 80%+ of readers mark content as helpful
4. **Q&A Activity**: 100+ questions asked per month
5. **User Retention**: 60%+ of guide readers return within 7 days
6. **Support Reduction**: 30% reduction in support tickets

## Dependencies
- **Feature 03**: Price Tracking (calculator data)
- **Feature 26**: Pattern/Float Database (educational examples)

## Effort Estimate
- **Database Schema**: 6 hours
- **EducationalContentService**: 14 hours
- **Article CMS**: 12 hours
- **Q&A System**: 12 hours
- **Calculator Framework**: 8 hours
- **API Endpoints**: 4 hours
- **Learn Hub Page**: 10 hours
- **Article Pages**: 8 hours
- **Q&A Pages**: 10 hours
- **Content Writing**: 40 hours (10+ articles)
- **Testing**: 6 hours
- **Total**: ~130 hours (3.25 weeks)

## Implementation Notes
1. **Content Strategy**: Write 10-15 core articles covering all basics first
2. **SEO**: Use keyword research to target high-volume search terms
3. **Internal Linking**: Link articles to related features (calculators, tools)
4. **Video Embedding**: Support YouTube embeds for tutorial videos
5. **Community Moderation**: Implement Q&A moderation queue

## Gotchas
1. **Content Quality**: Low-quality content hurts SEO - invest in good writing
2. **Outdated Content**: CS2 market changes - schedule content reviews quarterly
3. **Spam**: Q&A can attract spam - implement anti-spam measures
4. **Plagiarism**: Prevent users from copying official articles
5. **Legal**: Tax/legal advice disclaimer required

## Status Checklist
- [ ] Database schema created and migrated
- [ ] EducationalContentService implemented
- [ ] Article CMS functional
- [ ] Q&A system working
- [ ] Calculator framework built
- [ ] API endpoints created
- [ ] Learn hub page built
- [ ] Article template created
- [ ] Q&A pages completed
- [ ] 10+ articles written and published
- [ ] SEO meta tags configured
- [ ] Moderation tools implemented
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 23**: Craft Simulator (crafting guides)
- **Feature 26**: Pattern/Float Database (technical guides)
- **Feature 16**: Investment Insights (investment guides)

## References
- [Markdown Guide](https://www.markdownguide.org/)
- [SEO Best Practices](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Reddit Q&A System](https://www.reddit.com/)
- [Medium Content Platform](https://medium.com/)
