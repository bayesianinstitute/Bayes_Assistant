// const data = [
//     { chatId: '649b35664257f8e4b6c0e4c0', chats: ['chat1', 'chat2', 'chat3'] },
//     { chatId: '649b35b74257f8e4b6c0e4c2', chats: ['chat4', 'chat5', 'chat6'] }
//   ];
  
//   for (const item of data) {
//     const chatId = item.chatId;
//     const chats = item.chats;
  
//     console.log(`Chat ID: ${chatId}`);
//     console.log('Chats:');
//     console.log(chats);
//     console.log('-------------------');
//   }
  
// var http = require('http');

import { createServer } from 'http';

createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('Hello World!');
}).listen(8080);