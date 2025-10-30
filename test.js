const mysql = require('mysql');

const db = mysql.createConnection({
  host: '46.202.167.1',
  user: 'remoteuser',
  password: 'StrongPassword123!',
  database: 'nadeera_game'
});

db.connect(err => {
  if (err) console.error('❌ Connection failed:', err.message);
  else console.log('✅ Connected successfully to remote VPS MySQL!');
});
