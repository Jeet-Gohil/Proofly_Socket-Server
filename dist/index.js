"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // Allow frontend
        methods: ['GET', 'POST'],
    },
    transports: ['websocket'], // Force websocket for consistency
});
io.on('connection', (socket) => {
    console.log('[socket] client connected:', socket.id);
    socket.on('join_site', (siteId) => {
        socket.join(siteId);
        console.log(`[socket] ${socket.id} joined site: ${siteId}`);
    });
    socket.on('page_view', (data) => __awaiter(void 0, void 0, void 0, function* () {
        const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
        const ip = socket.handshake.address;
        console.log(ip);
        try {
            const geoRes = yield fetch(`https://ipapi.co/${ip}/json/`);
            const geo = geoRes.json();
            console.log(geo);
        }
        catch (err) {
        }
        const { siteId, path, timestamp, referrer, userId } = data;
        if (!siteId || !path)
            return;
        console.log(`[socket] Emitting live_view to siteId ${siteId}`, data);
        io.to(siteId).emit('live_view', {
            siteId,
            path,
            timestamp,
            userId,
            referrer,
            userAgent,
            ip,
        });
    }));
    //   socket.on('heatmap_event', async (data) => {
    //   // const {
    //   //   userId,
    //   //   siteId,
    //   //   sessionId,
    //   //   path,
    //   //   event_type,
    //   //   x,
    //   //   y,
    //   //   scroll_depth,
    //   //   timestamp,
    //   // } = data;
    //   try {
    //     // const heatmap_data = await pool.query(
    //     //   `INSERT INTO heatmap_events
    //     //    (user_id, site_id, session_id, path, event_type, x, y, scroll_depth, timestamp)
    //     //    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    //     //   [userId, siteId, sessionId, path, event_type, x ?? null, y ?? null, scroll_depth ?? null, timestamp]
    //     // );
    //     // console.log(heatmap_data);
    //   } catch (err) {
    //     console.error('Error inserting heatmap event:', err);
    //   }
    // });
    socket.on('disconnect', () => {
        console.log('[socket] client disconnected:', socket.id);
    });
});
server.listen(3001, () => {
    console.log('[server] Socket.IO listening on http://localhost:3001');
});
// import express from 'express';
// import http from 'http';
// import cors from 'cors';
// import { Server } from 'socket.io';
// import fetch from 'node-fetch';
// import dotenv from 'dotenv';
// dotenv.config(); // load .env (for MOCK_GEO or future env vars)
// const app = express();
// app.use(cors());
// app.set('trust proxy', true); // trust Render proxy for real IPs
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*', // ✅ your Vercel frontend domain
//     methods: ['GET', 'POST'],
//     credentials: true,
//   },
//   transports: ['websocket'],
// });
// // === GeoIP API response type
// interface GeoIPApiResponse {
//   ip: string;
//   city: string;
//   region: string;
//   country_name: string;
//   latitude: number;
//   longitude: number;
//   [key: string]: any;
// }
// // === Helper to extract real IP
// function getClientIP(socket: any): string {
//   const forwarded = socket.handshake.headers['x-forwarded-for'];
//   let ip =
//     (typeof forwarded === 'string' ? forwarded.split(',')[0] : null) ||
//     socket.handshake.address ||
//     '127.0.0.1';
//   if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
//   // Optional: mock IP during local dev only
//   const isMockEnabled = process.env.MOCK_GEO === 'true';
//   if ((ip === '::1' || ip === '127.0.0.1') && isMockEnabled) {
//     console.log('[mock] Using mock IP for local testing');
//     return '103.56.220.12'; // Replace with desired geo test IP
//   }
//   return ip;
// }
// // === Main Socket.IO logic
// io.on('connection', (socket) => {
//   console.log('[socket] client connected:', socket.id);
//   socket.on('join_site', (siteId) => {
//     socket.join(siteId);
//     console.log(`[socket] ${socket.id} joined site: ${siteId}`);
//   });
//   socket.on('page_view', async (data) => {
//     const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
//     const ip = getClientIP(socket);
//     let geo: Partial<GeoIPApiResponse> = {};
//     try {
//       const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
//       geo = (await geoRes.json()) as Partial<GeoIPApiResponse>;
//     } catch (error) {
//       console.warn('[geo] Failed to fetch geo data for IP:', ip);
//     }
//     const { siteId, path, timestamp, referrer, userId } = data;
//     if (!siteId || !path) return;
//     const enrichedData = {
//       siteId,
//       path,
//       timestamp,
//       userId,
//       referrer,
//       userAgent,
//       ip,
//       geo: {
//         country: geo.country_name || null,
//         city: geo.city || null,
//         region: geo.region || null,
//         latitude: geo.latitude || null,
//         longitude: geo.longitude || null,
//       },
//     };
//     console.log(`[socket] Emitting live_view to siteId ${siteId}`, enrichedData);
//     io.to(siteId).emit('live_view', enrichedData);
//   });
//   socket.on('disconnect', () => {
//     console.log('[socket] client disconnected:', socket.id);
//   });
// });
// // === Start server
// const PORT = process.env.PORT || 3001;
// server.listen(PORT, () => {
//   console.log(`[server] Socket.IO listening on http://localhost:${PORT}`);
// });
