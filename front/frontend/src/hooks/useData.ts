import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchSprints,
  fetchSprintsList,
  fetchSprint,
  createSprint,
  fetchWorkItems,
  fetchWorkItem,
  createWorkItem,
  updateWorkItem,
  fetchBoard,
  fetchInteractions,
  searchInteractions,
  fetchCommitActivity,
  fetchLeaderboard,
  fetchSprintReport,
  fetchTeam,
  fetchTeamMember,
  fetchAchievements,
  fetchActivityFeed,
  fetchProjectsList,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  createDecision,
} from "../lib/api";

// ─── Projects ───

export function useProjectsList(status?: string) {
  return useQuery({
    queryKey: ["projects-list", status],
    queryFn: () => fetchProjectsList(status),
    retry: 2,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
    retry: 2,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createProject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects-list"] });
      toast.success("Project created");
    },
    onError: (err: Error) => toast.error(`Failed to create project: ${err.message}`),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateProject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects-list"] });
      toast.success("Project updated");
    },
    onError: (err: Error) => toast.error(`Failed to update project: ${err.message}`),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cascade }: { id: string; cascade?: boolean }) =>
      deleteProject(id, cascade),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects-list"] });
      toast.success("Project deleted");
    },
    onError: (err: Error) => toast.error(`Failed to delete project: ${err.message}`),
  });
}

// ─── Sprints ───

export function useSprints(status?: string, projectId?: string) {
  return useQuery({
    queryKey: ["sprints", status, projectId],
    queryFn: () => fetchSprints(status, projectId),
    retry: 2,
  });
}

export function useSprintsList(status?: string, projectId?: string) {
  return useQuery({
    queryKey: ["sprints-list", status, projectId],
    queryFn: () => fetchSprintsList(status, projectId),
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
      qc.invalidateQueries({ queryKey: ["sprints-list"] });
      toast.success("Sprint created");
    },
    onError: (err: Error) => toast.error(`Failed to create sprint: ${err.message}`),
  });
}

// ─── Board (structured JSON for DnD) ───

export function useBoard(sprintId?: string, projectId?: string) {
  return useQuery({
    queryKey: ["board", sprintId, projectId],
    queryFn: () => fetchBoard(sprintId, projectId),
    retry: 2,
  });
}

// ─── Work Items ───

export function useWorkItems(filters?: {
  sprint_id?: string;
  project_id?: string;
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
      qc.invalidateQueries({ queryKey: ["board"] });
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

// ─── Decisions ───

export function useCreateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; user_id?: string; tags?: string[] }) =>
      createDecision(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interactions-search"] });
      qc.invalidateQueries({ queryKey: ["interactions"] });
      toast.success("Decision recorded");
    },
    onError: (err: Error) => toast.error(`Failed to create decision: ${err.message}`),
  });
}

// ─── Analytics ───

export function useCommitActivity(days: number = 30, repoUrl?: string, projectId?: string) {
  return useQuery({
    queryKey: ["commit-activity", days, repoUrl, projectId],
    queryFn: () => fetchCommitActivity(days, repoUrl, projectId),
    refetchInterval: 120_000,
    retry: 2,
  });
}

export function useLeaderboard(limit: number = 20, projectId?: string) {
  return useQuery({
    queryKey: ["leaderboard", limit, projectId],
    queryFn: () => fetchLeaderboard(limit, projectId),
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
