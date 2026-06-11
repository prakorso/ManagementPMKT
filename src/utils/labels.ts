import type {
  ActionItemStatus,
  CampaignTrack,
  HealthStatus,
  MeetingCategory,
  ObjectiveStatus,
  ProjectStatus,
  ReadinessArea,
} from '@/types';
import type { Tone } from '@/components/ui/Badge';

export const objectiveStatusLabel: Record<ObjectiveStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

export const objectiveStatusTone: Record<ObjectiveStatus, Tone> = {
  'not-started': 'neutral',
  'in-progress': 'warning',
  completed: 'success',
};

export const actionStatusLabel: Record<ActionItemStatus, string> = {
  open: 'Open',
  'in-progress': 'In Progress',
  done: 'Done',
};

export const actionStatusTone: Record<ActionItemStatus, Tone> = {
  open: 'neutral',
  'in-progress': 'warning',
  done: 'success',
};

export const healthLabel: Record<HealthStatus, string> = {
  'on-track': 'On Track',
  watch: 'Watch',
  'at-risk': 'At Risk',
};

export const healthTone: Record<HealthStatus, Tone> = {
  'on-track': 'success',
  watch: 'warning',
  'at-risk': 'danger',
};

export const meetingCategoryLabel: Record<MeetingCategory, string> = {
  'weekly-1on1': 'Weekly 1:1',
  'performance-checkin': 'Performance Check-in',
  'client-meeting': 'Client Meeting',
  'pmkt-meeting': 'PMKT Meeting',
  'assessment-discussion': 'Assessment Discussion',
};

export const meetingCategoryTone: Record<MeetingCategory, Tone> = {
  'weekly-1on1': 'brand',
  'performance-checkin': 'info',
  'client-meeting': 'success',
  'pmkt-meeting': 'warning',
  'assessment-discussion': 'neutral',
};

export const campaignTrackLabel: Record<CampaignTrack, string> = {
  'on-track': 'On Track',
  'off-track': 'Off Track',
  'at-risk': 'At Risk',
};

export const campaignTrackTone: Record<CampaignTrack, Tone> = {
  'on-track': 'success',
  'off-track': 'danger',
  'at-risk': 'warning',
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
};

export const readinessAreaLabel: Record<ReadinessArea, string> = {
  'people-management': 'People Management',
  reporting: 'Reporting',
  assessment: 'Assessment',
  'stakeholder-management': 'Stakeholder Management',
  delegation: 'Delegation',
};
