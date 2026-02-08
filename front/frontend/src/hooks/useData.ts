import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchSprints,
  fetchSprint,
  createSprint,
  fetchWorkItems,
  fetchWorkItem,
  createWorkItem,
  updateWorkItem,
  fetchInteractions,
  searchInteractions,
  fetchCommitActivity,
  fetchLeaderboard,
  fetchSprintReport,
  fetchTeam,
  fetchTeamMember,
  fetchAchievements,
  fetchActivityFeed,
} from "../lib/api";

// ─── Sprints ───

export function useSprints(status?: string) {
  return useQuery({
    queryKey: ["sprints", status],
    queryFn: () => fetchSprints(status),
    retry: 2,
  });
}

export function useSprint(sprintId: string) {
  return useQuery({
    queryKey: ["sprint", sprintId],
    queryFn: () => fetchSprint(sprintId),
    enabled: !!sprintId,
    retry: 2,
  });
}

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createSprint(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("Sprint created");
    },
    onError: (err: Error) => toast.error(`Failed to create sprint: ${err.message}`),
  });
}

// ─── Work Items ───

export function useWorkItems(filters?: {
  sprint_id?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
}) {
  return useQuery({
    queryKey: ["work-items", filters],
    queryFn: () => fetchWorkItems(filters),
    retry: 2,
  });
}

export function useWorkItem(itemId: string) {
  return useQuery({
    queryKey: ["work-item", itemId],
    queryFn: () => fetchWorkItem(itemId),
    enabled: !!itemId,
    retry: 2,
  });
}

export function useCreateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createWorkItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-items"] });
      toast.success("Work item created");
    },
    onError: (err: Error) => toast.error(`Failed to create work item: ${err.message}`),
  });
}

export function useUpdateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateWorkItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-items"] });
      toast.success("Work item updated");
    },
    onError: (err: Error) => toast.error(`Failed to update work item: ${err.message}`),
  });
}

// ─── Interactions ───

export function useInteractions(filters?: { user_id?: string; type?: string }) {
  return useQuery({
    queryKey: ["interactions", filters],
    queryFn: () => fetchInteractions(filters),
    retry: 2,
  });
}

export function useSearchInteractions(query: string) {
  return useQuery({
    queryKey: ["interactions-search", query],
    queryFn: () => searchInteractions(query),
    enabled: query.length >= 2,
    retry: 2,
  });
}

// ─── Analytics ───

export function useCommitActivity(days: number = 30) {
  return useQuery({
    queryKey: ["commit-activity", days],
    queryFn: () => fetchCommitActivity(days),
    refetchInterval: 120_000,
    retry: 2,
  });
}

export function useLeaderboard(limit: number = 20) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: () => fetchLeaderboard(limit),
    refetchInterval: 60_000,
    retry: 2,
  });
}

export function useSprintReport(sprintId: string) {
  return useQuery({
    queryKey: ["sprint-report", sprintId],
    queryFn: () => fetchSprintReport(sprintId),
    enabled: !!sprintId,
    retry: 2,
  });
}

// ─── Achievements ───

export function useAchievements(userId?: string, category?: string) {
  return useQuery({
    queryKey: ["achievements", userId, category],
    queryFn: () => fetchAchievements(userId, category),
    retry: 2,
  });
}

// ─── Team ───

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    retry: 2,
  });
}

export function useTeamMember(memberId: string) {
  return useQuery({
    queryKey: ["team-member", memberId],
    queryFn: () => fetchTeamMember(memberId),
    enabled: !!memberId,
    retry: 2,
  });
}

// ─── Activity Feed ───

export function useActivityFeed(limit: number = 20) {
  return useQuery({
    queryKey: ["activity-feed", limit],
    queryFn: () => fetchActivityFeed(limit),
    refetchInterval: 60_000,
    retry: 2,
  });
}
