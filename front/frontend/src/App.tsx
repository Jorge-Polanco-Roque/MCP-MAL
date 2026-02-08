import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProjectProvider } from "./hooks/useProjectContext";
import { ChatPage } from "./pages/ChatPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SprintsPage } from "./pages/SprintsPage";
import { BacklogPage } from "./pages/BacklogPage";
import { InteractionsPage } from "./pages/InteractionsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { NextStepsPage } from "./pages/NextStepsPage";
import { DecisionsPage } from "./pages/DecisionsPage";
import { CatalogPage } from "./pages/CatalogPage";

export default function App() {
  return (
    <ProjectProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ChatPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="sprints" element={<SprintsPage />} />
          <Route path="backlog" element={<BacklogPage />} />
          <Route path="interactions" element={<InteractionsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="profile/:userId" element={<ProfilePage />} />
          <Route path="next-steps" element={<NextStepsPage />} />
          <Route path="decisions" element={<DecisionsPage />} />
          <Route path="catalog" element={<CatalogPage />} />
        </Route>
      </Routes>
    </ProjectProvider>
  );
}
