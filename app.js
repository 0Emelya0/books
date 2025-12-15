// ==============================================
// КОНФИГУРАЦИЯ FIREBASE
// ==============================================
const firebaseConfig = {
    apiKey: "AIzaSyDvuVQorN5kS02t_gO3PmtFXa8vNJHrVoA",
    authDomain: "books-9b866.firebaseapp.com",
    projectId: "books-9b866",
    storageBucket: "books-9b866.firebasestorage.app",
    messagingSenderId: "151090971466",
    appId: "1:151090971466:web:241924af208ff6872ab7b3",
    measurementId: "G-HRF9YW9C9C"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==============================================
let currentUser = null;
let currentRating = 0;

// ==============================================
// УТИЛИТЫ
// ==============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notificationArea');
    if (container) {
        container.appendChild(notification);
    } else {
        document.body.appendChild(notification);
    }
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Стили для анимации выхода
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

function switchPage(pageId) {
    // Скрыть все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Показать выбранную страницу
    const page = document.getElementById(pageId + 'Page');
    if (page) {
        page.classList.add('active');
    }
    
    // Обновить активные ссылки в навигации
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });
    
    // Загрузить данные для страницы
    if (currentUser) {
        if (pageId === 'shelf') {
            loadBooks();
        } else if (pageId === 'clubs') {
            loadClubs();
            loadMyClubs();
        } else if (pageId === 'friends') {
            loadFriends();
            loadFriendRequests();
        }
    }
}

// ==============================================
// АВТОРИЗАЦИЯ
// ==============================================
function showAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    const submitText = document.getElementById('submitText');
    
    if (modal) {
        modal.style.display = 'flex';
        
        // Установить активную вкладку
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        if (submitText) {
            submitText.textContent = tab === 'login' ? 'Войти' : 'Зарегистрироваться';
        }
    }
}

function hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function handleAuth(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const activeTab = document.querySelector('.tab-btn.active');
    
    if (!usernameInput || !passwordInput || !activeTab) return;
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const isLogin = activeTab.dataset.tab === 'login';
    
    if (!username || !password) {
        showNotification('Введите никнейм и пароль', 'error');
        return;
    }
    
    try {
        if (isLogin) {
            await loginUser(username, password);
        } else {
            await registerUser(username, password);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function loginUser(username, password) {
    try {
        // Ищем пользователя в Firestore
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('username', '==', username)
            .where('password', '==', password)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            throw new Error('Неверный никнейм или пароль');
        }
        
        let userData = null;
        let userId = null;
        
        snapshot.forEach(doc => {
            userData = doc.data();
            userId = doc.id;
        });
        
        // Сохраняем пользователя
        currentUser = {
            id: userId,
            ...userData
        };
        
        // Обновляем интерфейс
        updateUI();
        hideAuthModal();
        switchPage('shelf');
        
        showNotification(`Добро пожаловать, ${username}!`, 'success');
        
    } catch (error) {
        throw new Error('Ошибка входа: ' + error.message);
    }
}

async function registerUser(username, password) {
    try {
        // Проверяем, существует ли пользователь
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('username', '==', username)
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            throw new Error('Пользователь с таким никнеймом уже существует');
        }
        
        // Создаем нового пользователя
        const userData = {
            username: username,
            password: password,
            createdAt: new Date().toISOString(),
            books: [],
            friends: [],
            clubs: [],
            friendRequests: []
        };
        
        // Добавляем в Firestore
        const docRef = await usersRef.add(userData);
        
        // Сохраняем пользователя
        currentUser = {
            id: docRef.id,
            ...userData
        };
        
        // Обновляем интерфейс
        updateUI();
        hideAuthModal();
        switchPage('shelf');
        
        showNotification('Регистрация успешна!', 'success');
        
    } catch (error) {
        throw new Error('Ошибка регистрации: ' + error.message);
    }
}

function logout() {
    currentUser = null;
    
    // Обновляем интерфейс
    document.querySelector('.auth-buttons').style.display = 'flex';
    document.querySelector('.user-menu').style.display = 'none';
    
    switchPage('home');
    
    showNotification('Вы вышли из системы', 'info');
}

function updateUI() {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    const userName = document.getElementById('userName');
    const currentUserSpan = document.getElementById('currentUser');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        
        if (userName) {
            userName.textContent = currentUser.username;
        }
        
        if (currentUserSpan) {
            currentUserSpan.textContent = currentUser.username;
        }
    }
}

// ==============================================
// КНИГИ
// ==============================================
function setupRatingStars() {
    const stars = document.querySelectorAll('.stars i');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const value = parseInt(this.dataset.value);
            setRating(value);
        });
    });
}

function setRating(rating) {
    currentRating = rating;
    
    // Обновляем звезды
    const stars = document.querySelectorAll('.stars i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
    
    // Обновляем значение
    const ratingValue = document.getElementById('ratingValue');
    if (ratingValue) {
        ratingValue.textContent = `${rating}/5`;
    }
}

async function addBook() {
    if (!currentUser) {
        showNotification('Войдите в систему', 'error');
        return;
    }
    
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const status = document.getElementById('bookStatus').value;
    const genre = document.getElementById('bookGenre').value;
    const review = document.getElementById('bookReview').value.trim();
    const rating = currentRating;
    
    if (!title || !author) {
        showNotification('Введите название и автора', 'error');
        return;
    }
    
    try {
        const bookData = {
            title: title,
            author: author,
            status: status,
            genre: genre,
            review: review,
            rating: rating,
            userId: currentUser.id,
            username: currentUser.username,
            createdAt: new Date().toISOString()
        };
        
        // Добавляем книгу в Firestore
        const docRef = await db.collection('books').add(bookData);
        bookData.id = docRef.id;
        
        // Добавляем ID книги пользователю
        await db.collection('users').doc(currentUser.id).update({
            books: firebase.firestore.FieldValue.arrayUnion(docRef.id)
        });
        
        // Очищаем форму
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookAuthor').value = '';
        document.getElementById('bookReview').value = '';
        setRating(0);
        
        // Обновляем отображение
        await loadBooks();
        
        showNotification('Книга добавлена!', 'success');
        
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

async function loadBooks() {
    if (!currentUser) return;
    
    try {
        // Получаем книги пользователя
        const booksRef = db.collection('books');
        const snapshot = await booksRef
            .where('userId', '==', currentUser.id)
            .orderBy('createdAt', 'desc')
            .get();
        
        const books = [];
        snapshot.forEach(doc => {
            books.push({ id: doc.id, ...doc.data() });
        });
        
        updateBooksDisplay(books);
        updateBookCounts(books);
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

function updateBooksDisplay(books) {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    if (books.length === 0) {
        booksGrid.innerHTML = '<p class="empty">Пока нет книг. Добавьте первую!</p>';
        return;
    }
    
    // Фильтруем по активной вкладке
    const activeTab = document.querySelector('.tab.active');
    const status = activeTab ? activeTab.dataset.status : 'read';
    const filteredBooks = books.filter(book => book.status === status);
    
    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = `<p class="empty">На этой полке пока нет книг</p>`;
        return;
    }
    
    booksGrid.innerHTML = filteredBooks.map(book => `
        <div class="book-card">
            <h4>${book.title}</h4>
            <p class="book-meta">Автор: ${book.author}</p>
            <p class="book-meta">Жанр: ${book.genre}</p>
            <p class="book-meta">Оценка: ${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}</p>
            ${book.review ? `<p class="review">"${book.review}"</p>` : ''}
            <div class="book-actions">
                <small>Добавлено: ${new Date(book.createdAt).toLocaleDateString()}</small>
            </div>
        </div>
    `).join('');
}

function updateBookCounts(books) {
    const total = books.length;
    const read = books.filter(b => b.status === 'read').length;
    const reading = books.filter(b => b.status === 'reading').length;
    const want = books.filter(b => b.status === 'want').length;
    
    const bookCount = document.getElementById('bookCount');
    const readCount = document.getElementById('readCount');
    const readingCount = document.getElementById('readingCount');
    const wantCount = document.getElementById('wantCount');
    
    if (bookCount) bookCount.textContent = `${total} книг`;
    if (readCount) readCount.textContent = read;
    if (readingCount) readingCount.textContent = reading;
    if (wantCount) wantCount.textContent = want;
}

// ==============================================
// КЛУБЫ
// ==============================================
async function createClub() {
    if (!currentUser) {
        showNotification('Войдите в систему', 'error');
        return;
    }
    
    const name = document.getElementById('clubName').value.trim();
    const genre = document.getElementById('clubGenre').value;
    const description = document.getElementById('clubDescription').value.trim();
    
    if (!name || !description) {
        showNotification('Заполните название и описание', 'error');
        return;
    }
    
    try {
        const clubData = {
            name: name,
            genre: genre,
            description: description,
            ownerId: currentUser.id,
            ownerName: currentUser.username,
            members: [currentUser.id],
            membersCount: 1,
            createdAt: new Date().toISOString()
        };
        
        // Добавляем клуб в Firestore
        const docRef = await db.collection('clubs').add(clubData);
        
        // Добавляем клуб пользователю
        await db.collection('users').doc(currentUser.id).update({
            clubs: firebase.firestore.FieldValue.arrayUnion(docRef.id)
        });
        
        // Очищаем форму
        document.getElementById('clubName').value = '';
        document.getElementById('clubDescription').value = '';
        
        // Обновляем отображение
        await loadClubs();
        await loadMyClubs();
        
        showNotification('Клуб создан!', 'success');
        
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

async function loadClubs() {
    try {
        const clubsRef = db.collection('clubs');
        const snapshot = await clubsRef.orderBy('createdAt', 'desc').get();
        
        const clubs = [];
        snapshot.forEach(doc => {
            clubs.push({ id: doc.id, ...doc.data() });
        });
        
        updateClubsDisplay(clubs);
        
    } catch (error) {
        console.error('Ошибка загрузки клубов:', error);
    }
}

async function loadMyClubs() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.id).get();
        const userData = userDoc.data();
        const clubIds = userData?.clubs || [];
        
        const myClubs = [];
        for (const clubId of clubIds) {
            const clubDoc = await db.collection('clubs').doc(clubId).get();
            if (clubDoc.exists) {
                myClubs.push({ id: clubDoc.id, ...clubDoc.data() });
            }
        }
        
        updateMyClubsDisplay(myClubs);
        
    } catch (error) {
        console.error('Ошибка загрузки моих клубов:', error);
    }
}

function updateClubsDisplay(clubs) {
    const clubsGrid = document.getElementById('clubsGrid');
    if (!clubsGrid) return;
    
    if (clubs.length === 0) {
        clubsGrid.innerHTML = '<p class="empty">Пока нет клубов. Создайте первый!</p>';
        return;
    }
    
    clubsGrid.innerHTML = clubs.map(club => {
        const isMember = club.members && club.members.includes(currentUser?.id);
        
        return `
            <div class="club-card">
                <h4>${club.name}</h4>
                <p class="club-meta">Жанр: ${club.genre}</p>
                <p class="club-meta">Создатель: ${club.ownerName}</p>
                <p class="club-meta">Участников: ${club.membersCount}</p>
                <p>${club.description}</p>
                <div class="club-actions">
                    <button class="btn ${isMember ? 'btn-outline' : 'btn-primary'} btn-small join-club" 
                            data-club-id="${club.id}">
                        ${isMember ? 'Вы в клубе' : 'Присоединиться'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики для кнопок присоединения
    document.querySelectorAll('.join-club').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const clubId = e.target.dataset.clubId;
            await joinClub(clubId);
        });
    });
}

function updateMyClubsDisplay(clubs) {
    const myClubsList = document.getElementById('myClubsList');
    if (!myClubsList) return;
    
    if (clubs.length === 0) {
        myClubsList.innerHTML = '<p class="empty">Вы не состоите в клубах</p>';
        return;
    }
    
    myClubsList.innerHTML = clubs.map(club => `
        <div class="club-card">
            <h4>${club.name}</h4>
            <p class="club-meta">Жанр: ${club.genre}</p>
            <p>${club.description}</p>
            <div class="club-actions">
                <span class="badge">${club.membersCount} участников</span>
            </div>
        </div>
    `).join('');
}

async function joinClub(clubId) {
    if (!currentUser) {
        showNotification('Войдите в систему', 'error');
        return;
    }
    
    try {
        const clubDoc = await db.collection('clubs').doc(clubId).get();
        const clubData = clubDoc.data();
        
        if (!clubData) {
            throw new Error('Клуб не найден');
        }
        
        const isMember = clubData.members && clubData.members.includes(currentUser.id);
        
        if (isMember) {
            // Выход из клуба
            await db.collection('clubs').doc(clubId).update({
                members: firebase.firestore.FieldValue.arrayRemove(currentUser.id),
                membersCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            await db.collection('users').doc(currentUser.id).update({
                clubs: firebase.firestore.FieldValue.arrayRemove(clubId)
            });
            
            showNotification('Вы вышли из клуба', 'info');
        } else {
            // Вступление в клуб
            await db.collection('clubs').doc(clubId).update({
                members: firebase.firestore.FieldValue.arrayUnion(currentUser.id),
                membersCount: firebase.firestore.FieldValue.increment(1)
            });
            
            await db.collection('users').doc(currentUser.id).update({
                clubs: firebase.firestore.FieldValue.arrayUnion(clubId)
            });
            
            showNotification('Вы присоединились к клубу!', 'success');
        }
        
        // Обновляем данные
        await loadClubs();
        await loadMyClubs();
        
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

// ==============================================
// ДРУЗЬЯ
// ==============================================
async function searchFriends() {
    const username = document.getElementById('friendSearch').value.trim();
    
    if (!username) {
        showNotification('Введите никнейм', 'error');
        return;
    }
    
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('username', '>=', username)
            .where('username', '<=', username + '\uf8ff')
            .limit(10)
            .get();
        
        const results = [];
        snapshot.forEach(doc => {
            if (doc.id !== currentUser?.id) {
                results.push({ id: doc.id, ...doc.data() });
            }
        });
        
        displaySearchResults(results);
        
    } catch (error) {
        showNotification('Ошибка поиска', 'error');
    }
}

function displaySearchResults(users) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    if (users.length === 0) {
        searchResults.innerHTML = '<p class="empty">Пользователи не найдены</p>';
        return;
    }
    
    searchResults.innerHTML = users.map(user => {
        return `
            <div class="friend-item">
                <div class="friend-info">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div>
                        <h4>${user.username}</h4>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-primary btn-small send-request" data-user-id="${user.id}">
                        Добавить
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики для кнопок отправки запросов
    document.querySelectorAll('.send-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await sendFriendRequest(userId);
        });
    });
}

async function sendFriendRequest(friendId) {
    if (!currentUser) return;
    
    try {
        const requestData = {
            senderId: currentUser.id,
            senderName: currentUser.username,
            receiverId: friendId,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        // Добавляем запрос в Firestore
        await db.collection('friends').add(requestData);
        
        showNotification('Запрос отправлен', 'success');
        
        // Обновляем результаты поиска
        await searchFriends();
        
    } catch (error) {
        showNotification('Ошибка отправки запроса', 'error');
    }
}

async function loadFriends() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.id).get();
        const userData = userDoc.data();
        const friendIds = userData?.friends || [];
        
        const friends = [];
        for (const friendId of friendIds) {
            const friendDoc = await db.collection('users').doc(friendId).get();
            if (friendDoc.exists) {
                friends.push({ id: friendDoc.id, ...friendDoc.data() });
            }
        }
        
        updateFriendsDisplay(friends);
        
    } catch (error) {
        console.error('Ошибка загрузки друзей:', error);
    }
}

async function loadFriendRequests() {
    if (!currentUser) return;
    
    try {
        const friendsRef = db.collection('friends');
        const snapshot = await friendsRef
            .where('receiverId', '==', currentUser.id)
            .where('status', '==', 'pending')
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });
        
        updateRequestsDisplay(requests);
        
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
    }
}

function updateFriendsDisplay(friends) {
    const friendsList = document.getElementById('friendsList');
    const friendsCount = document.getElementById('friendsCount');
    
    if (!friendsList) return;
    
    if (friends.length === 0) {
        friendsList.innerHTML = '<p class="empty">Пока нет друзей</p>';
        if (friendsCount) friendsCount.textContent = '0';
        return;
    }
    
    friendsList.innerHTML = friends.map(friend => `
        <div class="friend-item">
            <div class="friend-info">
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div>
                    <h4>${friend.username}</h4>
                </div>
            </div>
            <div class="friend-actions">
                <button class="btn btn-outline btn-small remove-friend" data-user-id="${friend.id}">
                    Удалить
                </button>
            </div>
        </div>
    `).join('');
    
    if (friendsCount) friendsCount.textContent = friends.length;
    
    // Добавляем обработчики для кнопок удаления
    document.querySelectorAll('.remove-friend').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await removeFriend(userId);
        });
    });
}

function updateRequestsDisplay(requests) {
    const requestsList = document.getElementById('requestsList');
    const requestsCount = document.getElementById('requestsCount');
    
    if (!requestsList) return;
    
    if (requests.length === 0) {
        requestsList.innerHTML = '<p class="empty">Нет заявок в друзья</p>';
        if (requestsCount) requestsCount.textContent = '0';
        return;
    }
    
    requestsList.innerHTML = requests.map(request => `
        <div class="request-item">
            <div class="friend-info">
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div>
                    <h4>${request.senderName}</h4>
                    <p>Хочет добавить вас в друзья</p>
                </div>
            </div>
            <div class="friend-actions">
                <button class="btn btn-primary btn-small accept-request" data-request-id="${request.id}">
                    Принять
                </button>
                <button class="btn btn-outline btn-small decline-request" data-request-id="${request.id}">
                    Отклонить
                </button>
            </div>
        </div>
    `).join('');
    
    if (requestsCount) requestsCount.textContent = requests.length;
    
    // Добавляем обработчики для кнопок заявок
    document.querySelectorAll('.accept-request, .decline-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const requestId = e.target.dataset.requestId;
            const action = e.target.classList.contains('accept-request') ? 'accept' : 'decline';
            await handleFriendRequest(requestId, action);
        });
    });
}

async function handleFriendRequest(requestId, action) {
    try {
        const requestDoc = await db.collection('friends').doc(requestId).get();
        const requestData = requestDoc.data();
        
        if (action === 'accept') {
            // Обновляем статус запроса
            await db.collection('friends').doc(requestId).update({
                status: 'accepted'
            });
            
            // Добавляем друг другу в друзья
            await db.collection('users').doc(currentUser.id).update({
                friends: firebase.firestore.FieldValue.arrayUnion(requestData.senderId)
            });
            
            await db.collection('users').doc(requestData.senderId).update({
                friends: firebase.firestore.FieldValue.arrayUnion(currentUser.id)
            });
            
            showNotification('Заявка принята!', 'success');
        } else {
            // Отклоняем запрос
            await db.collection('friends').doc(requestId).update({
                status: 'declined'
            });
            
            showNotification('Заявка отклонена', 'info');
        }
        
        // Обновляем данные
        await loadFriends();
        await loadFriendRequests();
        
    } catch (error) {
        showNotification('Ошибка обработки заявки', 'error');
    }
}

async function removeFriend(friendId) {
    if (!confirm('Удалить из друзей?')) return;
    
    try {
        // Удаляем друг у друга из друзей
        await db.collection('users').doc(currentUser.id).update({
            friends: firebase.firestore.FieldValue.arrayRemove(friendId)
        });
        
        await db.collection('users').doc(friendId).update({
            friends: firebase.firestore.FieldValue.arrayRemove(currentUser.id)
        });
        
        showNotification('Друг удален', 'info');
        
        // Обновляем данные
        await loadFriends();
        
    } catch (error) {
        showNotification('Ошибка удаления друга', 'error');
    }
}

// ==============================================
// НАСТРОЙКА СОБЫТИЙ
// ==============================================
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Навигация
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page === 'home' || currentUser) {
                switchPage(page);
            } else {
                showAuthModal('login');
            }
        });
    });
    
    // Кнопки авторизации
    document.getElementById('loginBtn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('registerBtn').addEventListener('click', () => showAuthModal('register'));
    document.getElementById('startBtn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Модальное окно
    document.querySelector('.close').addEventListener('click', hideAuthModal);
    document.getElementById('authForm').addEventListener('submit', handleAuth);
    
    // Закрытие модального окна по клику вне его
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('authModal');
        if (e.target === modal) {
            hideAuthModal();
        }
    });
    
    // Вкладки в модальном окне
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            // Обновить активную вкладку
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Обновить текст кнопки
            const submitText = document.getElementById('submitText');
            if (submitText) {
                submitText.textContent = tab === 'login' ? 'Войти' : 'Зарегистрироваться';
            }
        });
    });
    
    // Книги
    document.getElementById('addBookBtn').addEventListener('click', addBook);
    
    // Звезды рейтинга
    setupRatingStars();
    
    // Вкладки полок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const status = this.dataset.status;
            
            // Обновить активную вкладку
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Загрузить книги для этой полки
            if (currentUser) {
                loadBooks();
            }
        });
    });
    
    // Клубы
    document.getElementById('createClubBtn').addEventListener('click', createClub);
    
    // Друзья
    document.getElementById('searchFriendBtn').addEventListener('click', searchFriends);
    
    // Мобильное меню
    document.querySelector('.menu-toggle').addEventListener('click', function() {
        const navLinks = document.querySelector('.nav-links');
        navLinks.classList.toggle('active');
    });
    
    console.log('Обработчики событий настроены');
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ ДЕМО-ДАННЫХ
// ==============================================
async function initDemoData() {
    try {
        // Проверяем, есть ли демо-пользователь
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('username', '==', 'user').limit(1).get();
        
        if (snapshot.empty) {
            // Создаем демо-пользователя
            const demoUser = {
                username: 'user',
                password: 'user123',
                createdAt: new Date().toISOString(),
                books: [],
                friends: [],
                clubs: [],
                friendRequests: []
            };
            
            await usersRef.add(demoUser);
            console.log('Демо-пользователь создан');
        }
        
    } catch (error) {
        console.error('Ошибка инициализации демо-данных:', error);
    }
}

// ==============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ==============================================
async function init() {
    console.log('Запуск приложения...');
    
    // Инициализируем демо-данные
    await initDemoData();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Настраиваем рейтинг
    setupRatingStars();
    
    console.log('Приложение запущено!');
}

// Запускаем приложение
document.addEventListener('DOMContentLoaded', init);
