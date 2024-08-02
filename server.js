const express = require('express');
const path = require('path');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const IPINFO_API_TOKEN = '08cf3071fa85c1';

const botToken = '7491271001:AAEOiriYnXp_fFXVS_Iqvekzga6wSH0NxhU';

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Подключаем статические файлы
app.use(express.static(path.join(__dirname, 'build')));

app.use(cors()); // Это позволит все запросы из любых источников


let db = new sqlite3.Database('./election.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
      console.error('Error opening database', err.message);
  } else {
      console.log('Connected to the election database.');
  }
});

// Создание таблиц
db.serialize(() => {
    // Создание таблицы для общих голосов
    db.run(`CREATE TABLE IF NOT EXISTS total_votes (
        candidate TEXT PRIMARY KEY,
        votes INTEGER DEFAULT 0
    )`);
  
    // Добавление начальных данных
    db.run(`INSERT OR IGNORE INTO total_votes (candidate, votes) VALUES ('Trump', 0), ('Harris', 0)`);
  
    db.run(`CREATE TABLE IF NOT EXISTS try (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT,
          last_name TEXT,
          username TEXT,
          language_code TEXT,
          is_premium TEXT,
          city TEXT,
          country TEXT,
          ip TEXT
    )`);
  });

process.on('SIGINT', () => {
  db.close(() => {
      console.log('База данных закрыта из-за завершения работы сервера');
      process.exit(0);
  });
});


function incrementTrumpTotalVotes() {
  const updateQuery = `UPDATE total_votes SET votes = votes + 1 WHERE candidate = 'Trump';`;
  const selectQuery = `SELECT votes FROM total_votes WHERE candidate = 'Trump';`;

  db.run(updateQuery, function(updateErr) {
      if (updateErr) {
          console.error('Error updating Trump votes', updateErr.message);
      } else {
          db.get(selectQuery, (selectErr, row) => {
              if (selectErr) {
                  console.error('Error fetching Trump votes', selectErr.message);
              } else {
                  console.log(`Current number of votes for Trump: ${row.votes}`);
              }
          });
      }
  });
}

function incrementHarrisTotalVotes() {
  const updateQuery = `UPDATE total_votes SET votes = votes + 1 WHERE candidate = 'Harris';`;
  const selectQuery = `SELECT votes FROM total_votes WHERE candidate = 'Harris';`;

  db.run(updateQuery, function(updateErr) {
      if (updateErr) {
          console.error('Error updating Harris votes', updateErr.message);
      } else {
          db.get(selectQuery, (selectErr, row) => {
              if (selectErr) {
                  console.error('Error fetching Harris votes', selectErr.message);
              } else {
                  console.log(`Current number of votes for Harris: ${row.votes}`);
              }
          });
      }
  });
}


app.post('/submit', async (req, res) => {
    const { id, first_name, last_name, username, language_code, is_premium } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('Получены данные:', {
        id,
        first_name,
        last_name,
        username,
        language_code,
        is_premium
    });

    const geoResponse = await fetch(`https://ipinfo.io/${ipAddress}?token=${IPINFO_API_TOKEN}`);
    const geoData = await geoResponse.json();
    const { city, country, ip } = geoData;
    console.log('Geo Data:', { city, country, ip });

    const processedLastName = last_name || '';
    const processedUsername = username || '';

    db.run(`INSERT INTO try (id, first_name, last_name, username, language_code, is_premium, city, country, ip)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                 [id, first_name, processedLastName, processedUsername, language_code, is_premium, city, country, ip], 
                 function(err) {
        if (err) {
            return console.error('Error inserting data', err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
    });
    
    res.status(200).json({ message: 'Данные успешно получены' });
});


// Эндпоинт для увеличения голосов за Трампа
app.post('/vote/trump', (req, res) => {
  incrementTrumpTotalVotes();
  res.send({ message: 'Vote for Trump registered' });
});

// Эндпоинт для увеличения голосов за Харрис
app.post('/vote/harris', (req, res) => {
  incrementHarrisTotalVotes();
  res.send({ message: 'Vote for Harris registered' });
});

app.get('/votes', (req, res) => {
  db.all(`SELECT candidate, votes FROM total_votes`, [], (err, rows) => {
      if (err) {
          res.status(500).json({ error: err.message });
          return;
      }
      res.json({
          votes: rows.reduce((acc, row) => {
              acc[row.candidate] = row.votes;
              return acc;
          }, {})
      });
  });
});

function validateHash(params) {
    const token = '7491271001:AAEOiriYnXp_fFXVS_Iqvekzga6wSH0NxhU'; // Токен вашего бота
    const secret_key = crypto.createHash('sha256').update(token).digest();

    const data_check_string = Object.keys(params)
        .filter(key => key !== 'hash') // Исключите 'hash' из данных
        .sort() // Сортировка ключей в алфавитном порядке
        .map(key => `${key}=${params[key]}`) // Формирование строки в формате 'key=value'
        .join('\n'); // Склейка через перенос строки

    const hmac = crypto.createHmac('sha256', secret_key).update(data_check_string).digest('hex');

    return hmac === params.hash; // Сравнение вычисленного хеша с полученным
}


// Обработка любых маршрутов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
