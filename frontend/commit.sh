#!/bin/bash
set -e

# Commits for aesthetic modifications
git add src/App.css
git commit -m "feat(ui): update primary colors and button aesthetics to earth tones"

git add src/index.css
git commit -m "feat(ui): implement dark theme colors and make layout 100% full screen"

# Commits for routing and component cleanup
git add src/App.tsx
git commit -m "fix(router): bind index path to Home layout instead of force redirection"

git add src/pages/Home.tsx
git commit -m "refactor(home): remove redundant standalone header matching new Global Layout UI"

# Commits for fixes
git add src/contexts/AuthContext.tsx
git commit -m "fix(auth): update Auth loop to fetch getMe as backend omits User from payload"

# Commits for new untracked Layouts/Styling components
git add src/components/MainLayout.tsx src/styles/MainLayout.css
git commit -m "feat(layout): implement robust MainLayout wrapper with consistent navigation"

git add src/components/Sidebar.tsx src/styles/Sidebar.css
git commit -m "feat(nav): introduce primary Sidebar navigation and responsive layout wrapper"

# Commits for new Quiz session views
git add src/pages/Quiz.tsx src/styles/Quiz.css src/styles/QuizPages.css || echo "Some quiz files not tracked but trying"
git commit -m "feat(quiz): construct active quiz session components and core styling"

# Commits for new Quiz mode selectors
git add src/pages/TopicQuiz.tsx src/pages/DocumentQuiz.tsx
git commit -m "feat(features): outline logic views for Topic-based and Document-based quizzes"

# Commits for auxiliary files
git add src/pages/Todos.tsx
git commit -m "feat(todos): configure placeholder for future planner tasks"

# Ensure all remaining changes are staged if any
git add .
# Check if anything is left to commit
if ! git diff-index --quiet HEAD --; then
  git commit -m "chore: track miscellaneous environment and minor updates"
fi

git push origin master
