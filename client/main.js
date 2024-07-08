const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let postIts = [];
const users = {
    'user1': 'password1',
    'user2': 'password2'
};

// Middleware para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para o body parser
app.use(bodyParser.json());

// Middleware para sessões
app.use(session({
    secret: 'mySecret',
    resave: false,
    saveUninitialized: false,
}));

// Middleware de autenticação
function authMiddleware(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// Rota para login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        req.session.user = username;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Rota para logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true });
    });
});

// Rota para obter post-its
app.get('/postits', authMiddleware, (req, res) => {
    res.json(postIts.filter(postIt => postIt.user === req.session.user));
});

// Rota para criar post-its
app.post('/postits', authMiddleware, (req, res) => {
    const newPostIt = { ...req.body, user: req.session.user };
    postIts.push(newPostIt);
    io.emit('newPostIt', newPostIt); // Emitir evento para todos os clientes
    res.status(201).json(newPostIt);
});

// Inicializar o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor iniciado na porta ${PORT}`));
