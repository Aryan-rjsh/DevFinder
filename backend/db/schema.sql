-- 1. USERS — login / signup
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  skills       TEXT[],
  bio          TEXT,
  github_url   VARCHAR(255),
  linkedin_url VARCHAR(255),
  avatar_url   TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- 2. TEAMS — hosted by a user
CREATE TABLE teams (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  hosted_by   VARCHAR(100),
  description TEXT,
  tech_stack  TEXT[],
  roles       TEXT[],          -- roles needed e.g. {UI/UX, Backend, ML}
  team_size   INTEGER DEFAULT 4,
  deadline    DATE,
  created_by  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 3. TEAM MEMBERS — users who joined a team
CREATE TABLE team_members (
  id        SERIAL PRIMARY KEY,
  team_id   INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(100),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 4. APPLICATIONS — someone applying to join a team
CREATE TABLE applications (
  id           SERIAL PRIMARY KEY,
  team_id      INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  applicant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(100),
  message      TEXT,
  status       VARCHAR(20) DEFAULT 'pending',
  applied_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, applicant_id)
);

-- 5. MESSAGES — real-time team chat
CREATE TABLE messages (
  id         SERIAL PRIMARY KEY,
  team_id    INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  sender_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);