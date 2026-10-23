# Contributors Guide

Thank you for your interest in contributing to **The Gift of Chess (Jumuiya Web)**! Follow this guide to get your local environment configured and submit your changes.

---

## 1. Fork & Clone

1. **Fork the repository** on GitHub by clicking the **Fork** button at the top right of [jumuiya_web](https://github.com/jumuiyachess/jumuiya_web).
2. **Clone your fork** to your local machine:
   ```bash
   git clone https://github.com/<your-username>/jumuiya_web.git
   cd jumuiya_web
   ```
3. **Add the upstream repository** to keep your fork updated:
   ```bash
   git remote add upstream https://github.com/jumuiyachess/jumuiya_web.git
   ```

---

## 2. Request Environment Variables (`.env`)

For security reasons, database secrets, Supabase keys, and external API credentials are not stored in the repository.

- **Contact an admin/lead** on the project team to obtain the required environment values for development.
- Once provided, create a `.env.local` file in the project root:
  ```bash
  cp .env.example .env.local
  ```
- Paste the credentials provided by the admin into your `.env.local` file.

---

## 3. Install Dependencies & Branch

1. **Install dependencies** using npm:
   ```bash
   npm install
   ```
2. **Create a new branch** for your feature or bugfix from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

---

## 4. Development & Testing

1. **Run the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view your changes.

2. **Run lint checks** before committing:
   ```bash
   npm run lint
   ```

---

## 5. Commit & Open a Pull Request (PR)

1. **Commit your changes** with clear, descriptive commit messages:
   ```bash
   git add .
   git commit -m "feat: describe your change"
   ```

2. **Sync with upstream `main`** to avoid merge conflicts:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

3. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Submit a Pull Request**:
   - Go to the original [jumuiya_web repository](https://github.com/jumuiyachess/jumuiya_web).
   - Click **New Pull Request** and select your branch.
   - Fill in the PR description detailing what changed and link any relevant issues.
   - Wait for review and approval from the maintainers.
