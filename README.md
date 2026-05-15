# DevFinder 

### Stop coding in a vacuum. Start building in a pack
We have all been there. You have a world-changing idea, but you are stuck in the mud because you are a CSS wizard who cannot write a SQL query to save your life. Or maybe you are a backend architect whose UI designs look like they were pulled from a 1994 GeoCities archive.

DevFinder is the bridge. It is a matchmaker built by developers, for developers. No more solo-grinding through hackathons. Find your missing piece, sync up with the right talent, and turn those "what if" ideas into "look at this" realities.

**🌍 Live Deployments:**
- **Frontend (Live Site):** [https://devfinder-orpin.vercel.app](https://devfinder-orpin.vercel.app)
- **Backend API:** [https://devfinder-backend-ll4g.onrender.com](https://devfinder-backend-ll4g.onrender.com)
- **Database:** Hosted on [Neon.tech](https://neon.tech/)

---

## 1. Project Theme
DevFinder is a matchmaker platform built by developers, for developers. No more solo-grinding through hackathons. Find your missing piece, sync up with the right talent, and turn those "what if" ideas into "look at this" realities. 

The platform serves two distinct experiences:
- **User Experience:** Developers can create their own teams, apply to join existing ones, build their skill portfolios, discover hackathons, and chat in real-time with their squad. 
- **Admin Experience:** Platform administrators have a dedicated dashboard to monitor total users and teams, delete inappropriate teams, feature standout teams on the homepage, and send platform-wide broadcast notifications to all users.

---

## 2. Features
- **Seamless Authentication:** Secure user onboarding and encrypted session management.
- **The Team Architect:** Build your own squad from the ground up or scout for existing teams that need your specific skills.
- **Application System:** Users can apply to teams with custom messages; team hosts can accept or reject applicants.
- **Real-Time Chat:** Integrated team chat channels powered by Socket.io for instant communication.
- **Live Notifications:** Real-time bell alerts for new applications, team acceptances, and admin broadcasts.
- **Admin Control Panel:** Exclusive administrative controls to moderate teams, view platform analytics, and broadcast messages.
- **Deep Search:** Filter through teams to find the projects that match your vibe.

---

## 3. Technologies Used
**Frontend:**
- HTML5 / CSS3 / Vanilla JavaScript
- Vercel (Hosting & Routing)

**Backend:**
- Node.js & Express.js
- Socket.io (Real-time WebSockets)
- Render (Web Service Hosting)

**Database:**
- PostgreSQL
- Neon.tech (Serverless Postgres Engine)

---

## 4. Team Details
Engineered with passion by:
* **SREERAG T C** - AM.SC.U4CSE25252
* **ARYAN RAJESH** - AM.SC.U4CSE25206
* **NIVED KRISHNA** - AM.SC.U4CSE25265
* **ABHISHEK R PILLAI** - AM.SC.U4CSE25266

---

## Local Development Setup

### 1. Pull the Repository
```bash
git clone https://github.com/SREERAG-CODER/DevFinder.git
cd TEAM-SEEK
```

### 2. Ignite the Backend
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder and populate it with your environment variables:
```env
PORT=5000
JWT_SECRET=your_unique_secret_key
DATABASE_URL=your_neon_postgresql_connection_string
```
Kickstart the backend server:
```bash
npm run dev
```

### 3. Launch the Frontend
The interface is located in the `frontend` directory. It uses vanilla technologies without a build step.
- Open the project in VS Code.
- Right-click the `frontend` folder or any HTML file inside it and select **Open with Live Server**.
- The site will launch in your browser and automatically connect to your local backend!
