# RealTime Chat Application  
*A real-time chat app with video calling, built with .NET 9, Angular 19, and SQLite.*  

[![.NET 9](https://img.shields.io/badge/.NET-9.0-purple.svg)](https://dotnet.microsoft.com/)  
[![Angular 19](https://img.shields.io/badge/Angular-19.0-red.svg)](https://angular.io/)  
[![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-green.svg)](https://webrtc.org/)  

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Video Calling Implementation](#video-calling-implementation)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Features
- **Real-time messaging** with SignalR and typing indicators
- **Video calling** using WebRTC (peer-to-peer)
- User authentication (login/register)
- User-based chat with SQLite persistence
- Responsive Angular UI with dedicated video components

---

## Tech Stack
### Backend
- .NET 9 Web API
- SignalR for real-time communication
- SQLite database
- JWT authentication


### Frontend
- Angular 19
- WebRTC for video calls
- Bootstrap/CSS3 for styling
- Postman and ThunderClient used for api testing

---

## Video Calling Implementation
### Key Components
- **Frontend**: WebRTC (`peerjs`) + Angular components
- **Signaling**: .NET SignalR `VideoHub, ChatHub`

### How to Use
1. Click "Video Call" in chat sidebar
3. Grant camera/microphone permissions
4. Hang up via UI button when done

> **Note**: For best results, use Chrome/Microsoft Edge.
---

## Run the Application

### Prerequisites
- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js v20](https://nodejs.org/) (includes npm)
- Angular19 CLI (`npm install -g @angular/cli`)

---

### 1. Start the Backend (API)
```bash
cd API
dotnet watch run
```
### 2. Start the Frontend (Client)
```bash
cd ../client/angular
npm install    # First-time setup
npm start     # Launch development server
```
----

### Troubleshooting Guide

| Issue            | Solution                                                                 |
|------------------|--------------------------------------------------------------------------|
| No video/audio   | 1. Check browser permissions<br>2. Verify no other app is using devices  |
| Black screen     | 1. Refresh page<br>2. Restart call<br>3. Check GPU acceleration         |


