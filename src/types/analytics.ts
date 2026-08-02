export type AnalyticsGranularity = "hour" | "day" | "week" | "month";

export interface AnalyticsFilters {
  userId: string;
  startDate: Date;
  endDate: Date;
  assistantId?: string;
  granularity: AnalyticsGranularity;
}

export interface DashboardMetrics {
  totalCalls: number;
  totalDurationMinutes: number;
  totalDurationHours: number;
  avgDurationMinutes: number;
  callsToday: number;
  callsThisWeek: number;
  callsThisMonth: number;
}

export interface AssistantBreakdownItem {
  assistantId: string;
  assistantName: string;
  callCount: number;
}

export interface PhoneBreakdownItem {
  phoneNumber: string;
  callCount: number;
  totalDurationMinutes: number;
  totalDurationHours: number;
  avgDurationMinutes: number;
}

export interface TimeSeriesPoint {
  bucket: string;
  callCount: number;
}

export interface ServiceBreakdownItem {
  service: string;
  callCount: number;
}

export interface PlatformBillableItem {
  platformNumber: string;
  totalBillableMinutes: number;
}
