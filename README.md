# 📱💬 Real-Time Chat App-Whispa (React Native + Node.js + Socket.IO)

A simple **1:1 real-time chat application** built with **React Native (Expo)** frontend and **Node.js + Express + Socket.IO** backend. Messages and user data are persisted in **MongoDB**.

---

## 🚀 Features

* 🔑 JWT-based **Authentication** (Register/Login)
* 👥 **User list** with online/offline status
* ⚡ **Real-time messaging** via Socket.IO
* ✍️ **Typing indicators**
* ✅ **Message delivery \& read receipts**
* 🗄️ Messages persisted in **MongoDB**
* 🎨 Clean UI using **React Native Gifted Chat**

---

## 🛠️ Tech Stack

* **Frontend:** React Native (Expo), React Navigation, Gifted Chat
* **Backend:** Node.js, Express, Socket.IO
* **Database:** MongoDB (Community/Atlas)
* **Authentication:** JWT + bcryptjs

---

## 📂 Project Structure

```
chat-app/
├── mobile/     → React Native (Expo) app
├── server/     → Node.js + Express + Socket.IO backend
└── README.md   → Overview and Instructions about the project
```

---

## ⚙️ Setup Instructions

### 1\. Clone the Repository

```bash
git clone https://github.com/your-username/chat-app.git
cd chat-app
```

### 2\. Backend Setup

Navigate to the server directory and install dependencies:

```bash
cd server
npm install
```

Create a `.env` file inside the `/server` directory:

```env
PORT=4000
MONGO\_URI=mongodb://localhost:27017/Whispa
JWT\_SECRET=supersecretkey
```

Run the server:

```bash
npm run dev
```

👉 Server will start at `http://localhost:4000`

### 3\. Mobile App Setup

Navigate to the mobile directory and install dependencies:

```bash
cd ../mobile
npm install
```

Create a `.env` file inside the `/mobile` directory:

```env
API\_URL=http://YOUR\_IP:5000
SOCKET\_URL=http://YOUR\_IP:5000
```

⚠️ **Important:** Replace `YOUR\_IP` with your system's local IP address (e.g., `192.168.1.5`) so the mobile app can connect to the backend.

Run the mobile app:

```bash
npx expo start
```

After the development server starts:

* Press `w` to launch the app in a web browser
* Press `a` to launch on Android Emulator  
* Scan the QR code with the Expo Go app on your mobile device to launch on Android smartphone.

---

## 👤 Sample Users

You can register new users via the app or seed the database manually. Example test accounts:

```json
\[
  { "username": "alice", "password": "alice" },
  { "username": "bob", "password": "bob" }
]
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login user |
| `GET` | `/users` | Fetch all users |
| `GET` | `/conversations/:id/messages` | Get messages for a chat |

---

## 🔌 Socket.IO Events

| Event | Description |
|-------|-------------|
| `message:send` | Send new message |
| `message:new` | Receive new message |
| `typing:start` \\| `typing:stop` | Typing indicator |
| `message:read` | Mark message as read |

---

## 📹 Demo

🎥 Watch the demo here: [Whispa Demo Video](https://drive.google.com/file/d/1klboDtz5c8oVsduozkFQSztyNqD1g-eD/view?usp=sharing)


---

## 📝 License

MIT License – feel free to use this project as a starter template.

