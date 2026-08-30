export type WeeklyReminder = {
  id: string;
  title: string;
  enabled: boolean;
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
};

export type WeeklyReminderSnapshot = {
  maxActive: number;
  reminders: WeeklyReminder[];
};
