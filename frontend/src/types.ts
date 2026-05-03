export type DepartmentAnalytics = {
  deptId: number;
  deptName: string;
  totalEmissions: number;
  baseline: number;
  variance: number;
  usagePercent: number;
  exceedsBaseline: boolean;
};

export type LeaderboardEntry = DepartmentAnalytics & {
  rank: number;
};

export type ReferenceDepartment = {
  id: number;
  name: string;
  baseline: number;
};

export type ReferenceActivity = {
  activityType: string;
  factor: number;
  unit: string;
};

export type ReferenceData = {
  departments: ReferenceDepartment[];
  activities: ReferenceActivity[];
};

export type LogSubmission = {
  deptId: number;
  activityType: string;
  units: number;
};

export type ActivityLogResponse = {
  id: number;
  deptId: number;
  deptName: string;
  activityType: string;
  units: number;
  co2Result: number;
  timestamp: string;
  totalEmissions: number;
  baseline: number;
  exceedsBaseline: boolean;
};