const http = require('http');

const loginData = JSON.stringify({ username: 'vhr', password: '[REDACTED]' });

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Login:', response.ok ? 'SUCCESS' : 'FAILED');
      if (response.ok && response.token) {
        const token = response.token;
        const messagesOptions = {
          hostname: 'localhost',
          port: 3000,
          path: '/api/admin/messages',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token
          }
        };
        
        const messagesReq = http.request(messagesOptions, (res2) => {
          let data2 = '';
          res2.on('data', chunk => { data2 += chunk; });
          res2.on('end', () => {
            const messagesResponse = JSON.parse(data2);
            console.log('Messages API:', messagesResponse.ok ? 'SUCCESS' : 'FAILED');
            if (messagesResponse.messages) {
              console.log('Count:', messagesResponse.messages.length);
              messagesResponse.messages.forEach((msg, i) => {
                console.log('  [' + (i+1) + '] ' + msg.name + ' - ' + msg.subject);
              });
            }
          });
        });
        messagesReq.on('error', e => console.error('Error:', e.message));
        messagesReq.end();
      }
    } catch(e) {
      console.error('Parse error:', e.message);
    }
  });
});

loginReq.on('error', (e) => { console.error('Error:', e.message); });
loginReq.setTimeout(5000, () => { console.error('Timeout'); loginReq.destroy(); });
loginReq.write(loginData);
loginReq.end();
