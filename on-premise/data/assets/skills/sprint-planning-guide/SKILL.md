# Sprint Planning Guide

## Overview
Guide for planning and executing sprints in the MAL platform. Covers estimation, capacity planning, goals, and retrospectives.

## Story Point Estimation (Fibonacci)
| Points | Complexity | Example |
|--------|-----------|---------|
| 1 | Trivial | Fix a typo, update a constant |
| 2 | Simple | Add a field to an existing form |
| 3 | Small | New API endpoint with tests |
| 5 | Medium | New feature with UI + backend |
| 8 | Large | Multi-service integration |
| 13 | Very Large | New subsystem or major refactor |
| 21 | Epic-sized | Break this down further |

## Capacity Planning
```
Team Capacity = (Number of devs) x (Available days) x (Focus factor)
Focus factor: 0.7 for experienced teams, 0.5 for new teams
Example: 3 devs x 10 days x 0.7 = 21 story points
```

## Sprint Goal
- One sentence describing what the sprint delivers
- Should be achievable and measurable
- Example: "Deliver gamification MVP — XP, levels, and leaderboard visible in the UI"

## Definition of Done
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Product owner accepted

## Velocity Calculation
```
Velocity = Story points completed (status = done) per sprint
Rolling average = (last 3 sprints) / 3
```

## Retrospective Formats

### Start-Stop-Continue
- **Start**: Things we should begin doing
- **Stop**: Things that aren't working
- **Continue**: Things that are going well

### 4Ls (Liked, Learned, Lacked, Longed For)
Quick and positive-focused format.

## MAL Sprint Workflow
1. Backlog refinement (before sprint)
2. Sprint planning (day 1)
3. Daily standups (async via MCP interactions)
4. Sprint review (demo day)
5. Retrospective (AI-assisted via Sprint Reporter agent)
