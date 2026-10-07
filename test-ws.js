const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5001/');
ws.on('open', function() {
  console.log('WS connected!');
  ws.send(JSON.stringify({ type: 'subscribe', topic: 'allLinks' }));
  setTimeout(function() {
    ws.send(JSON.stringify({ type: 'subscribe', topic: 'link:mytest' }));
  }, 100);
});
ws.on('message', function(data) {
  console.log('WS message:', data.toString());
});
ws.on('error', function(err) {
  console.error('WS error:', err.message);
});
ws.on('close', function() {
  console.log('WS closed');
});

// Trigger a hit to test broadcast
setTimeout(function() {
  console.log('Triggering a hit via curl...');
  const https = require('http');
  https.get('http://localhost:5001/mytest', function(res) {
    console.log('Hit request status:', res.statusCode);
  });
}, 500);

setTimeout(function() { process.exit(0); }, 3000);
