import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.set('trust proxy', true);
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Replace with frontend domain in production
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
});

// === Type for the final enriched Geo data
interface GeoIPApiResponse {
  ip: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

// === Raw response from ipinfo.io
interface IPInfoRawResponse {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string; // e.g., "23.03,72.57"
  [key: string]: any;
}

// === Helper: Get client IP from socket
function getClientIP(socket: any): string {
  let ip =
    socket.handshake.headers['x-forwarded-for']?.split(',')[0] ||
    socket.handshake.address ||
    '127.0.0.1';

  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');

  const isLocalIP =
    ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.');
  const isMockEnabled = process.env.MOCK_GEO === 'true';

  if (isLocalIP && isMockEnabled) {
    console.log('[mock] Using mock IP');
    return '103.56.220.12'; // Indian IP for dev
  }

  return ip;
}

// === Helper: Fetch geo data from ipinfo.io
async function getGeoFromIP(ip: string): Promise<GeoIPApiResponse | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token) {
    console.error('[geo] IPINFO_TOKEN missing from .env');
    return null;
  }

  try {
    const res = await fetch(`https://ipinfo.io/${ip}?token=f52cc9200f550d`);
    const ip1 = await fetch(`https://ipinfo.io/27.60.17.201?token=${token}`);
    if (!res.ok) {
      console.warn(`[geo] ipinfo.io returned status ${res.status}`);
      return null;
    }
    const geoData : IPInfoRawResponse = (await ip1.json()) as IPInfoRawResponse;
    
    const data: IPInfoRawResponse = (await res.json()) as IPInfoRawResponse;
    const [latitude, longitude] = data.loc?.split(',') ?? [];

    return {
      ip: data.ip,
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    };
  } catch (error) {
    console.error('[geo] Error fetching IP info:', error);
    return null;
  }
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
    console.log('[geo] IP detected:', ip);

    const geo = await getGeoFromIP(ip);

    const { siteId, path, timestamp, referrer, userId , sessionId} = data;
    if (!siteId || !path) return;
    console.log(sessionId);

    const enrichedData = {
      siteId,
      sessionId,
      path,
      timestamp,
      userId,
      referrer,
      userAgent,
      ip,
      geo,
    };

    console.log(`[socket] Emitting live_view to siteId ${siteId}`, enrichedData);
    io.to(siteId).emit('live_view', enrichedData);
  });

  socket.on('disconnect', () => {
    console.log('[socket] client disconnected:', socket.id);
  });
});

// === Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[server] Socket.IO listening on http://localhost:${PORT}`);
});
