import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useProjectsList } from "./useData";
import type { Project } from "@/lib/types";

interface ProjectContextType {
  activeProjectId: string | null;
  activeProject: Project | null;
  setActiveProjectId: (id: string | null) => void;
  projects: Project[];
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType>({
  activeProjectId: null,
  activeProject: null,
  setActiveProjectId: () => {},
  projects: [],
  isLoading: false,
});

const STORAGE_KEY = "mal-active-project";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const { data, isLoading } = useProjectsList();
  const projects = data?.items ?? [];

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) ?? null
    : null;

  const setActiveProjectId = (id: string | null) => {
    setActiveProjectIdState(id);
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  };

  // If the stored project no longer exists in the list, reset
  useEffect(() => {
    if (activeProjectId && projects.length > 0 && !projects.find((p) => p.id === activeProjectId)) {
      setActiveProjectId(null);
    }
  }, [activeProjectId, projects]);

  return (
    <ProjectContext.Provider
      value={{ activeProjectId, activeProject, setActiveProjectId, projects, isLoading }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  return useContext(ProjectContext);
}
