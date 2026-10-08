import { Router, Response } from 'express';
import { storageService } from '../services/storageService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET /api/stats (Dashboard overview for authenticated user)
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const customers = storageService.getCustomers(userId);
    const conversations = storageService.getConversations(undefined, userId);
    const memories = storageService.getMemories(undefined, userId);
    const issues = storageService.getIssues(undefined, userId);
    const timeline = storageService.getTimeline(undefined, userId);

    const openIssues = issues.filter(i => i.status === 'open');
    const needingAttention = customers.filter(c => c.health === 'Needs Attention' || c.health === 'At Risk');

    const recentConversations = conversations.slice(0, 5).map(c => {
      const cust = customers.find(cu => cu.id === c.customerId);
      const lastMsg = c.messages[c.messages.length - 1];
      return {
        id: c.id,
        title: c.title,
        customerName: cust?.name || 'Unknown Customer',
        company: cust?.company || '',
        updatedAt: c.updatedAt,
        messageCount: c.messages.length,
        lastMessageText: lastMsg?.text || 'Empty conversation'
      };
    });

    res.json({
      totalCustomers: customers.length,
      totalConversations: conversations.length,
      storedMemories: memories.length,
      openIssues: openIssues.length,
      customersNeedingAttention: needingAttention.length,
      recentActivity: timeline.slice(0, 8),
      recentConversations,
      healthCounts: {
        healthy: customers.filter(c => c.health === 'Healthy').length,
        needsAttention: customers.filter(c => c.health === 'Needs Attention').length,
        atRisk: customers.filter(c => c.health === 'At Risk').length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute stats', details: err.message });
  }
});

// GET /api/stats/insights (Deep Insights aggregation for authenticated user)
router.get('/insights', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const customers = storageService.getCustomers(userId);
    const memories = storageService.getMemories(undefined, userId);
    const issues = storageService.getIssues(undefined, userId);
    const conversations = storageService.getConversations(undefined, userId);
    const timeline = storageService.getTimeline(undefined, userId);

    const openIssues = issues.filter(i => i.status === 'open');
    const resolvedIssues = issues.filter(i => i.status === 'resolved');

    const memoryCategoryCounts: Record<string, number> = {};
    for (const mem of memories) {
      memoryCategoryCounts[mem.category] = (memoryCategoryCounts[mem.category] || 0) + 1;
    }

    const customersNeedingAttention = customers.filter(c => c.health !== 'Healthy').map(c => {
      const custIssues = issues.filter(i => i.customerId === c.id && i.status === 'open');
      const custMems = memories.filter(m => m.customerId === c.id);
      return {
        id: c.id,
        name: c.name,
        company: c.company,
        health: c.health,
        priority: c.priority || 'Medium',
        healthReason: c.healthReason,
        openIssuesCount: custIssues.length,
        memoryCount: custMems.length
      };
    });

    // Real dynamic chart data
    const healthDistribution = {
      healthy: customers.filter(c => c.health === 'Healthy').length,
      needsAttention: customers.filter(c => c.health === 'Needs Attention').length,
      atRisk: customers.filter(c => c.health === 'At Risk').length,
    };

    const issueSeverityDistribution = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    };

    const issuesStatusDistribution = {
      open: openIssues.length,
      resolved: resolvedIssues.length,
    };

    const priorityDistribution = {
      critical: customers.filter(c => (c.priority || 'Medium') === 'Critical').length,
      high: customers.filter(c => (c.priority || 'Medium') === 'High').length,
      medium: customers.filter(c => (c.priority || 'Medium') === 'Medium').length,
      low: customers.filter(c => (c.priority || 'Medium') === 'Low').length,
    };

    // Support activity over time (last 7 days from actual timeline and message events)
    const now = new Date();
    const activityMap: Record<string, number> = {};
    const days: Array<{ date: string; label: string }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      activityMap[isoDate] = 0;
      days.push({ date: isoDate, label });
    }

    // Count timeline events
    for (const ev of timeline) {
      if (ev.timestamp) {
        const dStr = ev.timestamp.split('T')[0];
        if (activityMap[dStr] !== undefined) {
          activityMap[dStr]++;
        }
      }
    }

    // Also include conversation messages in activity
    for (const conv of conversations) {
      for (const msg of conv.messages) {
        if (msg.timestamp) {
          const dStr = msg.timestamp.split('T')[0];
          if (activityMap[dStr] !== undefined) {
            activityMap[dStr]++;
          }
        }
      }
    }

    const activityOverTime = days.map(day => ({
      date: day.date,
      count: activityMap[day.date] || 0,
      label: day.label,
    }));

    res.json({
      totalCustomers: customers.length,
      openIssuesCount: openIssues.length,
      resolvedIssuesCount: resolvedIssues.length,
      customersNeedingAttention,
      openIssuesList: openIssues.slice(0, 10),
      memoryCategoryCounts,
      recentMemories: memories.slice(0, 8),
      healthDistribution,
      issueSeverityDistribution,
      issuesStatusDistribution,
      activityOverTime,
      priorityDistribution
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch insights', details: err.message });
  }
});

export default router;
