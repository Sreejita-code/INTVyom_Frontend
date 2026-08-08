import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Calendar as CalendarIcon, Filter, PieChart, TrendingUp, UserRound, Clock, Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AnalyticsFilters,
  DashboardMetrics,
  PlatformBillableReport,
  ServiceBreakdownItem,
  TimeSeriesPoint,
} from "@/types/analytics";
import {
  getCallsByAssistant,
  getCallsByPhoneNumber,
  getCallsByService,
  getCallsByTime,
  getDashboardMetrics,
  getDefaultAnalyticsDateRange,
  getPlatformBillableMinutes,
} from "@/services/analytics/analyticsService";
import {
  callListAssistantsEndpoint,
  condenseListAssistantsResponse,
} from "@/services/assistant/assistantService";
import { getStoredUser } from "@/services/storage/storageService";
import { cn } from "@/lib/utils";

type GranularityOption = "day" | "week" | "month";

interface AssistantOption {
  assistant_id: string;
  assistant_name: string;
}

const COLORS = ["#22c55e", "#06b6d4", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

const EMPTY_METRICS: DashboardMetrics = {
  totalCalls: 0,
  totalDurationMinutes: 0,
  totalDurationHours: 0,
  avgDurationMinutes: 0,
  callsToday: 0,
  callsThisWeek: 0,
  callsThisMonth: 0,
};

const EMPTY_BILLABLE: PlatformBillableReport = { items: [], evaluated: 0, skipped: 0 };

/** Every chart here is date-scoped, and setting two dates by hand for "last week" is a chore. */
const DATE_PRESETS: { label: string; days: number }[] = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const emptyStateMessage = "No analytics data found for the selected filters.";
const lowSignalServiceMessage = "Service split is not meaningful for this range.";
const TOP_N = 5;

const formatDuration = (minutes: number) => {
  if (!minutes) return "0s";
  const totalSeconds = Math.round(minutes * 60);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs}s`;
};

const formatBucket = (bucket: string) => {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const truncateLabel = (label: string, maxLength = 16) => {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}…`;
};

export default function AnalyticsPage() {
  const user = getStoredUser();
  const { toast } = useToast();
  const defaultRange = useMemo(() => getDefaultAnalyticsDateRange(), []);

  const [assistants, setAssistants] = useState<AssistantOption[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>("all");
  const [granularity, setGranularity] = useState<GranularityOption>("day");
  const [startDate, setStartDate] = useState<Date | undefined>(defaultRange.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultRange.endDate);

  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [assistantData, setAssistantData] = useState<{ assistantName: string; callCount: number }[]>([]);
  const [phoneData, setPhoneData] = useState<
    { phoneNumber: string; callCount: number; totalDurationMinutes: number; avgDurationMinutes: number }[]
  >([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>([]);
  const [serviceData, setServiceData] = useState<ServiceBreakdownItem[]>([]);
  const [billable, setBillable] = useState<PlatformBillableReport>(EMPTY_BILLABLE);

  const [loading, setLoading] = useState({
    metrics: false,
    assistant: false,
    phone: false,
    time: false,
    service: false,
    billable: false,
  });

  const baseFilters = useMemo<AnalyticsFilters | null>(() => {
    if (!user?.user_id || !startDate || !endDate) return null;

    return {
      userId: user.user_id,
      startDate,
      endDate,
      granularity,
      assistantId: selectedAssistant === "all" ? undefined : selectedAssistant,
    };
  }, [user?.user_id, startDate, endDate, granularity, selectedAssistant]);

  const setSectionLoading = useCallback((section: keyof typeof loading, value: boolean) => {
    setLoading((prev) => ({ ...prev, [section]: value }));
  }, []);

  const topAssistantData = useMemo(
    () => [...assistantData].sort((a, b) => b.callCount - a.callCount).slice(0, TOP_N),
    [assistantData]
  );

  const topPhoneData = useMemo(
    () => [...phoneData].sort((a, b) => b.callCount - a.callCount).slice(0, TOP_N),
    [phoneData]
  );

  const phoneMaxCalls = useMemo(
    () => topPhoneData.reduce((max, item) => Math.max(max, item.callCount), 0),
    [topPhoneData]
  );

  // Capped like every other breakdown on this page — a user with 40 platform numbers got an
  // unreadable strip of 2px bars here while the neighbouring charts showed a clean top five.
  const topBillableData = useMemo(
    () => [...billable.items].sort((a, b) => b.totalBillableMinutes - a.totalBillableMinutes).slice(0, TOP_N),
    [billable.items]
  );

  const rankedServiceData = useMemo(
    () => [...serviceData].sort((a, b) => b.callCount - a.callCount).slice(0, TOP_N),
    [serviceData]
  );

  const shouldHideServiceChart = useMemo(() => {
    if (rankedServiceData.length === 0) return false;
    if (rankedServiceData.length <= 1) return true;

    const totalCalls = rankedServiceData.reduce((sum, row) => sum + row.callCount, 0);
    if (totalCalls <= 0) return true;

    const topShare = rankedServiceData[0].callCount / totalCalls;
    return topShare >= 0.85;
  }, [rankedServiceData]);

  const fetchAssistants = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const { ok, json } = await callListAssistantsEndpoint({ userId: user.user_id });

      if (!ok) {
        throw new Error(
          (json as { error?: string; message?: string })?.error ||
            (json as { error?: string; message?: string })?.message ||
            "Failed to load assistants"
        );
      }

      const mapped = condenseListAssistantsResponse(json).map((item, index) => ({
        assistant_id: item.assistant_id || `assistant-${index}`,
        assistant_name: item.assistant_name || `Assistant ${index + 1}`,
      }));
      setAssistants(mapped);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to fetch assistants",
        description: "Assistant filter options are unavailable right now.",
      });
    }
  }, [user?.user_id, toast]);

  const fetchAllAnalytics = useCallback(async () => {
    if (!baseFilters) return;

    // Dispatched first, deliberately. There is no upstream aggregate behind this one — the backend
    // reads every call log for every assistant to build it — so it is always the last to land.
    // Starting it last as well made it queue behind five faster requests for a connection too.
    setSectionLoading("billable", true);
    getPlatformBillableMinutes(baseFilters)
      .then((report) => setBillable(report))
      .catch((error: Error) => {
        setBillable(EMPTY_BILLABLE);
        toast({ variant: "destructive", title: "Billable minutes failed", description: error.message });
      })
      .finally(() => setSectionLoading("billable", false));

    setSectionLoading("metrics", true);
    getDashboardMetrics(baseFilters)
      .then((data) => setMetrics(data))
      .catch((error: Error) => {
        setMetrics(EMPTY_METRICS);
        toast({ variant: "destructive", title: "Dashboard metrics failed", description: error.message });
      })
      .finally(() => setSectionLoading("metrics", false));

    setSectionLoading("assistant", true);
    getCallsByAssistant(baseFilters)
      .then((data) => setAssistantData(data.map((item) => ({ assistantName: item.assistantName, callCount: item.callCount }))))
      .catch((error: Error) => {
        setAssistantData([]);
        toast({ variant: "destructive", title: "Assistant analytics failed", description: error.message });
      })
      .finally(() => setSectionLoading("assistant", false));

    setSectionLoading("phone", true);
    getCallsByPhoneNumber(baseFilters)
      .then((data) =>
        setPhoneData(
          data.map((item) => ({
            phoneNumber: item.phoneNumber,
            callCount: item.callCount,
            totalDurationMinutes: item.totalDurationMinutes,
            avgDurationMinutes: item.avgDurationMinutes,
          }))
        )
      )
      .catch((error: Error) => {
        setPhoneData([]);
        toast({ variant: "destructive", title: "Phone analytics failed", description: error.message });
      })
      .finally(() => setSectionLoading("phone", false));

    setSectionLoading("time", true);
    getCallsByTime(baseFilters)
      .then((data) => setTimeSeriesData(data))
      .catch((error: Error) => {
        setTimeSeriesData([]);
        toast({ variant: "destructive", title: "Time trend analytics failed", description: error.message });
      })
      .finally(() => setSectionLoading("time", false));

    setSectionLoading("service", true);
    getCallsByService(baseFilters)
      .then((data) => setServiceData(data))
      .catch((error: Error) => {
        setServiceData([]);
        toast({ variant: "destructive", title: "Service analytics failed", description: error.message });
      })
      .finally(() => setSectionLoading("service", false));

  }, [baseFilters, setSectionLoading, toast]);

  // Presets set both ends at once; the pickers stay for anything they do not cover.
  const applyPreset = useCallback((days: number) => {
    const end = new Date();
    const start = new Date(end);
    // UTC boundaries, matching getDefaultAnalyticsDateRange — mixing the two drifts by a day.
    start.setUTCDate(start.getUTCDate() - days);
    start.setUTCHours(0, 0, 0, 0);
    setStartDate(start);
    setEndDate(end);
  }, []);

  const applyThisMonth = useCallback(() => {
    const end = new Date();
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    setStartDate(start);
    setEndDate(end);
  }, []);

  /** Which preset button reads as selected — a whole-day match, so the clock time is ignored. */
  const activePresetDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    const days = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
    return DATE_PRESETS.some((p) => p.days === days) ? days : null;
  }, [startDate, endDate]);

  const handleDownloadBillable = useCallback(() => {
    if (!user?.user_id || !startDate || !endDate) return;
    const query = new URLSearchParams({
      user_id: user.user_id,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    });
    window.open(`${import.meta.env.VITE_BACKEND_URL}/api/assistant/platform-billable-minutes/download?${query.toString()}`, "_blank");
  }, [user?.user_id, startDate, endDate]);

  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  if (!user?.user_id) {
    return (
      <div className="page-shell flex items-center justify-center text-muted-foreground">
        Please sign in to view analytics.
      </div>
    );
  }

  return (
    <div className="page-shell overflow-auto bg-background">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor call performance and trends for your account.</p>
        </div>

        {/*
          One row of controls, then the shortcuts underneath.

          The presets used to live inside the Date Range cell, which made that cell a row taller
          than its three neighbours. Grid rows size to the tallest cell, so the two selects sat at
          the top of the row and the Apply button at the bottom, and the bar read as two ragged
          lines. Keeping every control on one baseline is what `items-start` and the separate
          preset row below are for.
        */}
        <div className="border border-border/60 rounded-xl p-4 bg-card/20">
        <div className="grid grid-cols-1 items-start md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="grid gap-2 xl:col-span-2">
            <Label>Date Range</Label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal w-full", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal w-full", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate
                      ? endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Assistant</Label>
            <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assistants</SelectItem>
                {assistants.map((item) => (
                  <SelectItem key={item.assistant_id} value={item.assistant_id}>
                    {item.assistant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Granularity</Label>
            <Select value={granularity} onValueChange={(value: GranularityOption) => setGranularity(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            {/* Stands in for the labels the other cells have, so the button lines up with the
                controls beside it rather than with their labels. */}
            <span aria-hidden="true" className="hidden text-sm font-medium leading-none opacity-0 md:block">
              Apply
            </span>
            <Button
              className="w-full gap-2"
              onClick={fetchAllAnalytics}
              disabled={!startDate || !endDate || endDate < startDate}
            >
              <Filter className="h-4 w-4" />
              Apply
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
          <span className="mr-1 text-xs text-muted-foreground">Jump to</span>
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.days}
              type="button"
              variant={activePresetDays === preset.days ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => applyPreset(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={applyThisMonth}>
            This month
          </Button>
        </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Calls</CardDescription>
              <CardTitle className="text-2xl">
                {loading.metrics ? <Skeleton className="h-8 w-20" /> : metrics.totalCalls.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Duration</CardDescription>
              <CardTitle className="text-2xl">
                {loading.metrics ? <Skeleton className="h-8 w-20" /> : formatDuration(metrics.avgDurationMinutes)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Calls Today</CardDescription>
              <CardTitle className="text-2xl">
                {loading.metrics ? <Skeleton className="h-8 w-20" /> : metrics.callsToday.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Calls This Week</CardDescription>
              <CardTitle className="text-2xl">
                {loading.metrics ? <Skeleton className="h-8 w-20" /> : metrics.callsThisWeek.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Calls Over Time
              </CardTitle>
              <CardDescription>Granularity: {granularity}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.time ? (
                <Skeleton className="h-72 w-full" />
              ) : timeSeriesData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
              ) : (
                <ChartContainer
                  className="h-72 w-full"
                  config={{ calls: { label: "Calls", color: "hsl(var(--primary))" } }}
                >
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickFormatter={formatBucket} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="callCount" name="calls" stroke="var(--color-calls)" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                Top Assistants
              </CardTitle>
              <CardDescription>Top {TOP_N} by call volume</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.assistant ? (
                <Skeleton className="h-72 w-full" />
              ) : topAssistantData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
              ) : (
                <ChartContainer
                  className="h-72 w-full"
                  config={{ calls: { label: "Calls", color: "hsl(var(--primary))" } }}
                >
                  <BarChart data={topAssistantData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="assistantName"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => truncateLabel(String(value))}
                    />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => String(label)} />} />
                    <Bar dataKey="callCount" name="calls" fill="var(--color-calls)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Top Phone Numbers
              </CardTitle>
              <CardDescription>Top {TOP_N} by call volume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading.phone ? (
                <Skeleton className="h-72 w-full" />
              ) : topPhoneData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
              ) : (
                topPhoneData.map((row, index) => {
                  const width = phoneMaxCalls > 0 ? (row.callCount / phoneMaxCalls) * 100 : 0;
                  return (
                    <div key={row.phoneNumber} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm truncate">
                          {index + 1}. <span className="font-mono">{row.phoneNumber}</span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline">{row.callCount} calls</Badge>
                          <span className="text-xs text-muted-foreground">{formatDuration(row.avgDurationMinutes)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Billable Minutes
                </CardTitle>
                <CardDescription>
                  Platform numbers and their total billable minutes. Covers every assistant, so the
                  assistant filter above does not apply to this card.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadBillable} className="flex gap-2">
                <Download className="h-4 w-4" />
                Download Excel
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* A partial total presented as a complete one is the worst outcome on this page. */}
              {!loading.billable && billable.skipped > 0 && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5 text-[0.8125rem] leading-6 text-amber-500/90">
                  {billable.skipped} of {billable.evaluated} assistants could not be read, so these
                  totals are lower than the real figure. Try a narrower date range.
                </p>
              )}

              {loading.billable ? (
                <div className="grid gap-3">
                  <Skeleton className="h-72 w-full" />
                  <p className="text-[0.8125rem] leading-6 text-muted-foreground">
                    Adding up billable minutes across every assistant — this card reads each call log
                    in the range, so it lands after the others.
                  </p>
                </div>
              ) : topBillableData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
              ) : (
                <ChartContainer
                  className="h-72 w-full"
                  config={{ minutes: { label: "Billable Minutes", color: "hsl(var(--primary))" } }}
                >
                  <BarChart data={topBillableData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="platformNumber"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => truncateLabel(String(value))}
                    />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => String(label)} />} />
                    <Bar dataKey="totalBillableMinutes" name="minutes" fill="var(--color-minutes)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}

              {billable.items.length > TOP_N && !loading.billable && (
                <p className="text-[0.8125rem] leading-6 text-muted-foreground">
                  Showing the top {TOP_N} of {billable.items.length} platform numbers. Download the
                  spreadsheet for the rest.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                Calls by Service
              </CardTitle>
              <CardDescription>Shown only when service distribution has meaningful variance</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.service ? (
                <Skeleton className="h-72 w-full" />
              ) : rankedServiceData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
              ) : shouldHideServiceChart ? (
                <p className="text-sm text-muted-foreground">{lowSignalServiceMessage}</p>
              ) : (
                <ChartContainer
                  className="h-56 w-full"
                  config={Object.fromEntries(
                    rankedServiceData.map((item, index) => [
                      item.service,
                      { label: item.service, color: COLORS[index % COLORS.length] },
                    ])
                  )}
                >
                  <BarChart data={rankedServiceData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="service" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent nameKey="service" />} />
                    <Bar dataKey="callCount" name="Calls" radius={[8, 8, 0, 0]}>
                      {rankedServiceData.map((item, index) => (
                        <Cell key={`${item.service}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {endDate && startDate && endDate < startDate ? (
          <p className="text-sm text-destructive">End date cannot be before start date.</p>
        ) : null}
      </div>
    </div>
  );
}