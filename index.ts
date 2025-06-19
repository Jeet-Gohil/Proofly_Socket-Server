import { Server } from 'socket.io';
import express from 'express';
import http from 'http';
import cors from 'cors';




const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',   // Allow frontend
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

  socket.on('page_view', (data) => {
    const { siteId, path, timestamp, referrer, userId } = data;

    if (!siteId || !path) return;

    console.log(`[socket] Emitting live_view to siteId ${siteId}`, data);

    io.to(siteId).emit('live_view', {
      siteId,
      path,
      timestamp,
      userId,
      referrer,
    });
  });
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
