const { app } = require('@azure/functions');

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (_request, _context) => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
  }),
});
