
document.addEventListener('DOMContentLoaded', async () => {
    const whiteboard = document.querySelector('#whiteboard');
    const boardContainer = document.querySelector('#boardContainer');
    const inputPopup = document.querySelector('#inputPopup');
    const sendButton = document.querySelector('#sendButton');
    const loginForm = document.querySelector('#formLogin');
    const socket = io(); // Conecta ao servidor Socket.io

    let isPanning = false;
    let startX, startY, initialLeft, initialTop;
    let isSpacePressed = false;
    let zoomLevel = 1;
    let currentUser = null;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.querySelector('#username').value;
        const password = document.querySelector('#password').value;

        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            currentUser = username;
            loginForm.style.display = 'none';
            whiteboard.style.display = 'block';
            loadPostIts();
        } else {
            alert('Login failed');
        }
    });

    async function loadPostIts() {
        const response = await fetch('/postits');
        if (response.ok) {
            const postIts = await response.json();
            postIts.forEach(addPostItToBoard);
        } else {
            alert('Failed to load post-its');
        }
    }

    whiteboard.addEventListener('mousedown', (e) => {
        if (isSpacePressed) { // Inicia o pan apenas se a tecla espaço estiver pressionada
            isPanning = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = boardContainer.offsetLeft;
            initialTop = boardContainer.offsetTop;
            whiteboard.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            boardContainer.style.left = `${initialLeft + dx}px`;
            boardContainer.style.top = `${initialTop + dy}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isPanning = false;
        whiteboard.style.cursor = isSpacePressed ? 'grabbing' : 'grab';
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            isSpacePressed = true;
            whiteboard.style.cursor = 'grab';
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            isSpacePressed = false;
            whiteboard.style.cursor = 'default';
        }
    });

    whiteboard.addEventListener('click', (e) => {
        if (!isSpacePressed) {
            const rect = whiteboard.getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoomLevel;
            const y = (e.clientY - rect.top) / zoomLevel;
            openPopup(x, y);
        }
    });

    function openPopup(x, y) {
        const containerRect = boardContainer.getBoundingClientRect();
        inputPopup.style.display = 'block';
        inputPopup.style.left = `${x * zoomLevel + containerRect.left - whiteboard.getBoundingClientRect().left}px`;
        inputPopup.style.top = `${y * zoomLevel + containerRect.top - whiteboard.getBoundingClientRect().top}px`;
        inputPopup.dataset.x = x;
        inputPopup.dataset.y = y;
    }

    function closePopup() {
        inputPopup.style.display = 'none';
        document.querySelector('#formText').value = '';
    }

    sendButton.addEventListener('click', async function(e) {
        e.preventDefault();
        const formText = document.querySelector('#formText').value;
        const x = parseFloat(inputPopup.dataset.x);
        const y = parseFloat(inputPopup.dataset.y);
        const name = currentUser; // Usuário conectado
        const date = new Date().toLocaleString();

        const response = await fetch('/postits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: formText || 'aaaaa', x, y, name, date })
        });
        const postIt = await response.json();
        closePopup();
        addPostItToBoard(postIt);
    });

    function resizePostIt(postItElement) {
        const contentHeight = postItElement.querySelector('.content').scrollHeight;
        const metadataHeight = postItElement.querySelector('.metadata').scrollHeight;
        postItElement.style.height = `${contentHeight + metadataHeight + 20}px`; // 20px padding
    }

    function addPostItToBoard(postIt) {
        const postItElement = document.createElement('div');
        postItElement.classList.add('post-it');
        postItElement.innerHTML = `
            <div class="content">${postIt.content}</div>
            <div class="metadata">${postIt.name}<br>${postIt.date}</div>
        `;
        const rect = whiteboard.getBoundingClientRect();
        const containerRect = boardContainer.getBoundingClientRect();
        postItElement.style.left = `${postIt.x * zoomLevel + containerRect.left - rect.left}px`;
        postItElement.style.top = `${postIt.y * zoomLevel + containerRect.top - rect.top}px`;
        boardContainer.appendChild(postItElement);
        resizePostIt(postItElement);
    }

    const response = await fetch('/postits');
    const postIts = await response.json();
    postIts.forEach(addPostItToBoard);

    socket.on('newPostIt', postIt => {
        addPostItToBoard(postIt);
    });

    whiteboard.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const prevZoomLevel = zoomLevel;
        zoomLevel += e.deltaY * -zoomSpeed;
        zoomLevel = Math.min(Math.max(0.5, zoomLevel), 3);

        const rect = whiteboard.getBoundingClientRect();
        const dx = (e.clientX - rect.left) / prevZoomLevel;
        const dy = (e.clientY - rect.top) / prevZoomLevel;
        const newDx = (e.clientX - rect.left) / zoomLevel;
        const newDy = (e.clientY - rect.top) / zoomLevel;

        boardContainer.style.transformOrigin = `${dx}px ${dy}px`;
        boardContainer.style.transform = `scale(${zoomLevel})`;
    });

    let touchStartX, touchStartY, touchInitialLeft, touchInitialTop;

    whiteboard.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            if (isSpacePressed) {
                isPanning = true;
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                touchInitialLeft = boardContainer.offsetLeft;
                touchInitialTop = boardContainer.offsetTop;
                whiteboard.style.cursor = 'grabbing';
            } else {
                const rect = whiteboard.getBoundingClientRect();
                const x = (touch.clientX - rect.left) / zoomLevel;
                const y = (touch.clientY - rect.top) / zoomLevel;
                openPopup(x, y);
            }
        }
    });

    whiteboard.addEventListener('touchmove', (e) => {
        if (isPanning && e.touches.length === 1) {
            const touch = e.touches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            boardContainer.style.left = `${touchInitialLeft + dx}px`;
            boardContainer.style.top = `${touchInitialTop + dy}px`;
        }
    });

    whiteboard.addEventListener('touchend', () => {
        isPanning = false;
        whiteboard.style.cursor = isSpacePressed ? 'grabbing' : 'grab';
    });
});