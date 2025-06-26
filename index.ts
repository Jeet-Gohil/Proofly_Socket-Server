import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const app = express();

app.set('trust proxy', true); // ✅ Tell Express to trust reverse proxy (Render)

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // ✅ Replace with your deployed frontend domain
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
});

// === Type for Geo API Response
interface GeoIPApiResponse {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  latitude: number;
  longitude: number;
  [key: string]: any;
}

// === Helper: Get real client IP (Render → Express → You)
function getClientIP(socket: any): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  let ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
    socket.handshake.address ||
    '127.0.0.1';

  // Remove IPv6 wrapper
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');

  // Use mock IP only in development (never in production!)
  const isMockEnabled = process.env.MOCK_GEO === 'true';
  if ((ip === '::1' || ip === '127.0.0.1') && isMockEnabled) {
    console.log('[mock] Using mock IP');
    return '103.56.220.12'; // Indian IP for dev testing
  }

  return ip;
}

// === Socket.IO Logic
io.on('connection', (socket) => {
  console.log('[socket] client connected:', socket.id);

  socket.on('join_site', (siteId) => {
    socket.join(siteId);
    console.log(`[socket] ${socket.id} joined site: ${siteId}`);
  });

  socket.on('page_view', async (data) => {
    const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
    const ip = getClientIP(socket);

    let geo: Partial<GeoIPApiResponse> = {};
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      geo = (await geoRes.json()) as Partial<GeoIPApiResponse>;
    } catch (error) {
      console.warn('[geo] Failed to fetch geo data for IP:', ip);
    }

    const { siteId, path, timestamp, referrer, userId } = data;
    if (!siteId || !path) return;

    const enrichedData = {
      siteId,
      path,
      timestamp,
      userId,
      referrer,
      userAgent,
      ip,
      geo: {
        country: geo.country_name || null,
        city: geo.city || null,
        region: geo.region || null,
        latitude: geo.latitude || null,
        longitude: geo.longitude || null,
      },
    };

    console.log(`[socket] Emitting live_view to siteId ${siteId}`, enrichedData);
    io.to(siteId).emit('live_view', enrichedData);
  });

  socket.on('disconnect', () => {
    console.log('[socket] client disconnected:', socket.id);
  });
});

// === Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[server] Socket.IO listening on http://localhost:${PORT}`);
});
