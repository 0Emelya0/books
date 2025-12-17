// ==============================================
// КОНФИГУРАЦИЯ FIREBASE (версия 8)
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

// Инициализация Firebase (версия 8)
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("✅ Firebase инициализирован");
    } else {
        console.log("✅ Firebase уже инициализирован");
    }
} catch (error) {
    console.error("❌ Ошибка Firebase:", error);
}

// Инициализация Firestore
const db = firebase.firestore();

// ==============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==============================================
let currentUser = null;
let currentRating = 0;
let userBooks = [];
let allUsers = [];
let friends = [];
let friendRequests = [];

// ==============================================
// УТИЛИТЫ
// ==============================================
function showNotification(message, type = 'info') {
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #67c23a 0%, #85ce61 100%)' : 
                   type === 'error' ? 'linear-gradient(135deg, #f56c6c 0%, #f78989 100%)' : 
                   'linear-gradient(135deg, #8a9eff 0%, #a991f7 100%)'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(31, 38, 135, 0.2);
        z-index: 3000;
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-weight: 500;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Стили для анимации
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%) translateY(-20px); opacity: 0; }
            to { transform: translateX(0) translateY(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0) translateY(0); opacity: 1; }
            to { transform: translateX(100%) translateY(-20px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Сохранение и восстановление состояния
function saveSession() {
    if (currentUser) {
        const sessionData = {
            userId: currentUser.id,
            username: currentUser.username,
            timestamp: Date.now()
        };
        localStorage.setItem('bookShelfSession', JSON.stringify(sessionData));
        console.log("💾 Сессия сохранена:", sessionData.username);
    }
}

function restoreSession() {
    const sessionData = localStorage.getItem('bookShelfSession');
    if (sessionData) {
        try {
            const data = JSON.parse(sessionData);
            if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                console.log("🔄 Обнаружена сохраненная сессия для:", data.username);
                return data;
            } else {
                localStorage.removeItem('bookShelfSession');
                console.log("⌛ Сессия устарела");
            }
        } catch (error) {
            console.error("❌ Ошибка восстановления сессии:", error);
            localStorage.removeItem('bookShelfSession');
        }
    }
    return null;
}

function switchPage(pageId) {
    console.log(`📄 Переход на: ${pageId}`);
    
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    const page = document.getElementById(pageId + 'Page');
    if (page) {
        page.style.display = 'block';
        setTimeout(() => {
            page.classList.add('active');
        }, 10);
        document.body.className = `${pageId}-page`;
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });
    
    if (currentUser) {
        switch(pageId) {
            case 'shelf':
                loadBooks();
                break;
            case 'clubs':
                loadClubs();
                loadMyClubs();
                break;
            case 'friends':
                loadAllUsers();
                loadFriends();
                loadFriendRequests();
                break;
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
        const form = document.getElementById('authForm');
        if (form) form.reset();
    }
}

async function handleAuth(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const isLogin = document.querySelector('.tab-btn.active').dataset.tab === 'login';
    
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
        console.log(`🔐 Попытка входа: ${username}`);
        
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('username', '==', username)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            throw new Error('Пользователь не найден');
        }
        
        let userData = null;
        let userId = null;
        
        snapshot.forEach(doc => {
            userData = doc.data();
            userId = doc.id;
        });
        
        if (userData.password !== password) {
            throw new Error('Неверный пароль');
        }
        
        currentUser = {
            id: userId,
            username: userData.username,
            password: userData.password,
            createdAt: userData.createdAt || new Date(),
            books: [],
            friends: [],
            clubs: [],
            friendRequests: []
        };
        
        console.log("👤 Пользователь загружен:", currentUser.username);
        
        saveSession();
        updateUI();
        hideAuthModal();
        await loadUserData();
        switchPage('shelf');
        showNotification(`Добро пожаловать, ${username}!`, 'success');
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        throw new Error('Ошибка входа: ' + error.message);
    }
}

async function loadUserData() {
    if (!currentUser) return;
    
    console.log("📊 Загрузка данных пользователя...");
    
    try {
        await loadBooks();
        await loadFriends();
        await loadFriendRequests();
        await loadMyClubs();
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

async function registerUser(username, password) {
    try {
        console.log(`📝 Регистрация нового пользователя: ${username}`);
        
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('username', '==', username)
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            throw new Error('Пользователь уже существует');
        }
        
        const userData = {
            username: username,
            password: password,
            createdAt: new Date().toISOString(),
            books: [],
            friends: [],
            clubs: [],
            friendRequests: []
        };
        
        const docRef = await usersRef.add(userData);
        
        currentUser = {
            id: docRef.id,
            ...userData
        };
        
        console.log("✅ Пользователь зарегистрирован:", currentUser.username);
        
        saveSession();
        updateUI();
        hideAuthModal();
        switchPage('shelf');
        showNotification('Регистрация успешна!', 'success');
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        throw new Error('Ошибка регистрации: ' + error.message);
    }
}

function logout() {
    console.log("🚪 Выход из системы");
    
    currentUser = null;
    userBooks = [];
    friends = [];
    friendRequests = [];
    allUsers = [];
    
    localStorage.removeItem('bookShelfSession');
    
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
        
        if (userName) userName.textContent = currentUser.username;
        if (currentUserSpan) currentUserSpan.textContent = `Добро пожаловать, ${currentUser.username}!`;
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        if (currentUserSpan) currentUserSpan.textContent = 'Добро пожаловать!';
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
    
    const ratingValue = document.getElementById('ratingValue');
    if (ratingValue) ratingValue.textContent = `${rating}/5`;
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
    
    if (!genre) {
        showNotification('Выберите жанр', 'error');
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        console.log("📚 Добавление книги:", bookData);
        
        const docRef = await db.collection('books').add(bookData);
        const bookId = docRef.id;
        
        await db.collection('users').doc(currentUser.id).update({
            books: firebase.firestore.FieldValue.arrayUnion(bookId)
        });
        
        userBooks.unshift({
            id: bookId,
            ...bookData
        });
        
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookAuthor').value = '';
        document.getElementById('bookReview').value = '';
        setRating(0);
        
        updateBooksDisplay();
        updateBookCounts();
        saveSession();
        showNotification('Книга добавлена на полку!', 'success');
        
    } catch (error) {
        console.error('Ошибка добавления книги:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

async function loadBooks() {
    console.log("📖 Загрузка книг пользователя...");
    
    if (!currentUser) {
        console.log("❌ Нет текущего пользователя");
        return;
    }
    
    try {
        const snapshot = await db.collection('books')
            .where('userId', '==', currentUser.id)
            .get();
        
        userBooks = [];
        snapshot.forEach(doc => {
            const bookData = doc.data();
            userBooks.push({
                id: doc.id,
                ...bookData
            });
        });
        
        userBooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log(`📚 Загружено ${userBooks.length} книг из Firestore`);
        
        updateBooksDisplay();
        updateBookCounts();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки книг:', error);
        showNotification('Ошибка загрузки книг: ' + error.message, 'error');
    }
}

function updateBooksDisplay() {
    console.log("🔄 Обновление отображения книг...");
    
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) {
        console.error("❌ Элемент booksGrid не найден!");
        return;
    }
    
    if (!userBooks || userBooks.length === 0) {
        console.log("📭 Нет книг для отображения");
        booksGrid.innerHTML = '<p class="empty">Пока нет книг. Добавьте первую!</p>';
        return;
    }
    
    console.log(`📚 Отображение ${userBooks.length} книг`);
    
    const activeTab = document.querySelector('.tab.active');
    let status = 'read';
    if (activeTab && activeTab.dataset.status) {
        status = activeTab.dataset.status;
    }
    
    const filteredBooks = userBooks.filter(book => book.status === status);
    
    console.log(`📂 Фильтр: ${status}, найдено: ${filteredBooks.length}`);
    
    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = `<p class="empty">На этой полке пока нет книг</p>`;
        return;
    }
    
    booksGrid.innerHTML = filteredBooks.map(book => {
        const date = book.createdAt ? new Date(book.createdAt) : new Date();
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const stars = '★'.repeat(book.rating || 0) + '☆'.repeat(5 - (book.rating || 0));
        
        return `
            <div class="book-card">
                <h4>${book.title}</h4>
                <p class="book-meta"><strong>Автор:</strong> ${book.author}</p>
                <p class="book-meta"><strong>Жанр:</strong> ${book.genre}</p>
                <p class="book-meta"><strong>Оценка:</strong> ${stars}</p>
                ${book.review ? `<p class="review"><strong>Рецензия:</strong> "${book.review}"</p>` : ''}
                <div class="book-actions">
                    <small><strong>Добавлено:</strong> ${formattedDate}</small>
                </div>
            </div>
        `;
    }).join('');
    
    console.log("✅ Книги отображены успешно");
}

function updateBookCounts() {
    if (!currentUser || !userBooks || userBooks.length === 0) {
        console.log("📊 Нет данных для статистики книг");
        
        const bookCount = document.getElementById('bookCount');
        const readCount = document.getElementById('readCount');
        const readingCount = document.getElementById('readingCount');
        const wantCount = document.getElementById('wantCount');
        
        if (bookCount) bookCount.textContent = '0 книг';
        if (readCount) readCount.textContent = '0';
        if (readingCount) readingCount.textContent = '0';
        if (wantCount) wantCount.textContent = '0';
        return;
    }
    
    const total = userBooks.length;
    const read = userBooks.filter(b => b.status === 'read').length;
    const reading = userBooks.filter(b => b.status === 'reading').length;
    const want = userBooks.filter(b => b.status === 'want').length;
    
    console.log(`📊 Статистика книг: всего ${total}, прочитано ${read}, читаю ${reading}, хочу ${want}`);
    
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
        
        await db.collection('clubs').add(clubData);
        
        document.getElementById('clubName').value = '';
        document.getElementById('clubDescription').value = '';
        
        showNotification('Клуб создан!', 'success');
        
        await loadClubs();
        await loadMyClubs();
        
    } catch (error) {
        console.error('Ошибка создания клуба:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

async function loadClubs() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('clubs').get();
        
        const clubs = [];
        snapshot.forEach(doc => {
            clubs.push({ 
                id: doc.id, 
                ...doc.data()
            });
        });
        
        clubs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        updateClubsDisplay(clubs);
        
    } catch (error) {
        console.error('Ошибка загрузки клубов:', error);
    }
}

async function loadMyClubs() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('clubs')
            .where('members', 'array-contains', currentUser.id)
            .get();
        
        const myClubs = [];
        snapshot.forEach(doc => {
            myClubs.push({ 
                id: doc.id, 
                ...doc.data()
            });
        });
        
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
        const isMember = club.members && club.members.includes(currentUser.id);
        
        return `
            <div class="book-card">
                <h4>${club.name}</h4>
                <p class="book-meta"><strong>Жанр:</strong> ${club.genre}</p>
                <p class="book-meta"><strong>Создатель:</strong> ${club.ownerName}</p>
                <p class="book-meta"><strong>Участников:</strong> ${club.membersCount || 1}</p>
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
        <div class="book-card">
            <h4>${club.name}</h4>
            <p class="book-meta"><strong>Жанр:</strong> ${club.genre}</p>
            <p>${club.description}</p>
            <div class="club-actions">
                <span class="badge">${club.membersCount || 1} участников</span>
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
        if (!clubDoc.exists) {
            throw new Error('Клуб не найден');
        }
        
        const clubData = clubDoc.data();
        const isMember = clubData.members && clubData.members.includes(currentUser.id);
        
        if (isMember) {
            await db.collection('clubs').doc(clubId).update({
                members: firebase.firestore.FieldValue.arrayRemove(currentUser.id),
                membersCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            showNotification('Вы вышли из клуба', 'info');
        } else {
            await db.collection('clubs').doc(clubId).update({
                members: firebase.firestore.FieldValue.arrayUnion(currentUser.id),
                membersCount: firebase.firestore.FieldValue.increment(1)
            });
            
            showNotification('Вы присоединились к клубу!', 'success');
        }
        
        await loadClubs();
        await loadMyClubs();
        
    } catch (error) {
        console.error('Ошибка вступления в клуб:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

// ==============================================
// ДРУЗЬЯ (ИСПРАВЛЕННЫЙ ПОИСК И ДОБАВЛЕНИЕ)
// ==============================================
async function loadAllUsers() {
    if (!currentUser) return;
    
    try {
        console.log("👥 Загрузка всех пользователей...");
        
        const snapshot = await db.collection('users').get();
        
        allUsers = [];
        snapshot.forEach(doc => {
            const userData = doc.data();
            if (doc.id !== currentUser.id) {
                allUsers.push({
                    id: doc.id,
                    username: userData.username,
                    books: userData.books || [],
                    clubs: userData.clubs || [],
                    friends: userData.friends || [],
                    createdAt: userData.createdAt || new Date().toISOString()
                });
            }
        });
        
        console.log(`✅ Загружено ${allUsers.length} пользователей для поиска`);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error);
        showNotification('Ошибка загрузки пользователей', 'error');
    }
}

async function searchFriends() {
    const searchInput = document.getElementById('friendSearch');
    if (!searchInput) {
        showNotification('Поле поиска не найдено', 'error');
        return;
    }
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        showNotification('Введите никнейм для поиска', 'warning');
        return;
    }
    
    showNotification('Поиск пользователей...', 'info');
    
    try {
        // Ищем пользователей в Firestore по никнейму
        const snapshot = await db.collection('users')
            .where('username', '>=', searchTerm)
            .where('username', '<=', searchTerm + '\uf8ff')
            .get();
        
        const results = [];
        snapshot.forEach(doc => {
            const userData = doc.data();
            if (doc.id !== currentUser.id) {
                results.push({
                    id: doc.id,
                    username: userData.username,
                    books: userData.books || [],
                    clubs: userData.clubs || [],
                    friends: userData.friends || [],
                    createdAt: userData.createdAt || new Date().toISOString()
                });
            }
        });
        
        console.log(`🔍 Найдено ${results.length} пользователей по запросу: ${searchTerm}`);
        displaySearchResults(results);
        
    } catch (error) {
        console.error('Ошибка поиска пользователей:', error);
        showNotification('Ошибка поиска пользователей', 'error');
    }
}

function displaySearchResults(users) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) {
        console.error('Элемент searchResults не найден');
        return;
    }
    
    if (users.length === 0) {
        searchResults.innerHTML = '<p class="empty">Пользователи не найдены</p>';
        return;
    }
    
    searchResults.innerHTML = users.map(user => {
        const isFriend = friends.some(f => f.id === user.id);
        const hasPendingRequest = friendRequests.some(r => 
            r.senderId === user.id && r.receiverId === currentUser.id
        );
        
        let buttonHtml = '';
        
        if (isFriend) {
            buttonHtml = '<span class="badge">Уже друзья</span>';
        } else if (hasPendingRequest) {
            buttonHtml = '<span class="badge">Запрос отправлен</span>';
        } else {
            buttonHtml = `
                <button class="btn btn-primary btn-small send-friend-request" data-user-id="${user.id}">
                    Добавить в друзья
                </button>
            `;
        }
        
        return `
            <div class="friend-item">
                <div class="friend-info">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div>
                        <h4>${user.username}</h4>
                        <p class="friend-meta">Книг на полке: ${user.books ? user.books.length : 0}</p>
                        <p class="friend-meta">В клубах: ${user.clubs ? user.clubs.length : 0}</p>
                    </div>
                </div>
                <div class="friend-actions">
                    ${buttonHtml}
                    <button class="btn btn-outline btn-small view-user-books" data-user-id="${user.id}">
                        Книги
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики событий
    document.querySelectorAll('.send-friend-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await sendFriendRequest(userId);
        });
    });
    
    document.querySelectorAll('.view-user-books').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await showUserBooks(userId);
        });
    });
}

async function showUserBooks(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const userData = userDoc.data();
        
        // Получаем книги пользователя
        const snapshot = await db.collection('books')
            .where('userId', '==', userId)
            .get();
        
        if (snapshot.empty) {
            showNotification('У пользователя пока нет книг', 'info');
            return;
        }
        
        const books = [];
        snapshot.forEach(doc => {
            books.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Создаем модальное окно с книгами
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2><i class="fas fa-book"></i> Книги пользователя ${userData.username}</h2>
                <div class="books-grid" style="max-height: 400px; overflow-y: auto; margin-top: 20px;">
                    ${books.map(book => `
                        <div class="book-card">
                            <h4>${book.title}</h4>
                            <p class="book-meta"><strong>Автор:</strong> ${book.author}</p>
                            <p class="book-meta"><strong>Жанр:</strong> ${book.genre}</p>
                            <p class="book-meta"><strong>Статус:</strong> ${getStatusText(book.status)}</p>
                            ${book.review ? `<p class="review"><strong>Рецензия:</strong> "${book.review}"</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
    } catch (error) {
        console.error('Ошибка загрузки книг пользователя:', error);
        showNotification('Ошибка загрузки книг', 'error');
    }
}

function getStatusText(status) {
    switch(status) {
        case 'read': return 'Прочитано';
        case 'reading': return 'Читаю сейчас';
        case 'want': return 'Хочу прочитать';
        default: return status;
    }
}

async function sendFriendRequest(friendId) {
    if (!currentUser) return;
    
    try {
        console.log(`📨 Отправка запроса в друзья пользователю: ${friendId}`);
        
        // Проверяем, не отправили ли уже запрос
        const existingRequest = await db.collection('friendRequests')
            .where('senderId', '==', currentUser.id)
            .where('receiverId', '==', friendId)
            .where('status', '==', 'pending')
            .limit(1)
            .get();
        
        if (!existingRequest.empty) {
            showNotification('Запрос уже отправлен', 'warning');
            return;
        }
        
        // Проверяем, не друзья ли уже
        const userDoc = await db.collection('users').doc(currentUser.id).get();
        const userData = userDoc.data();
        if (userData.friends && userData.friends.includes(friendId)) {
            showNotification('Вы уже друзья', 'warning');
            return;
        }
        
        const requestData = {
            senderId: currentUser.id,
            senderName: currentUser.username,
            receiverId: friendId,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        await db.collection('friendRequests').add(requestData);
        
        showNotification('Запрос в друзья отправлен', 'success');
        
        // Обновляем список запросов
        await loadFriendRequests();
        
        // Обновляем поиск, чтобы показать измененный статус
        const searchInput = document.getElementById('friendSearch');
        if (searchInput && searchInput.value.trim()) {
            await searchFriends();
        }
        
    } catch (error) {
        console.error('Ошибка отправки запроса:', error);
        showNotification('Ошибка отправки запроса', 'error');
    }
}

async function loadFriends() {
    if (!currentUser) return;
    
    try {
        console.log("👥 Загрузка списка друзей...");
        
        const userDoc = await db.collection('users').doc(currentUser.id).get();
        const userData = userDoc.data();
        const friendIds = userData?.friends || [];
        
        friends = [];
        for (const friendId of friendIds) {
            const friendDoc = await db.collection('users').doc(friendId).get();
            if (friendDoc.exists) {
                const friendData = friendDoc.data();
                friends.push({
                    id: friendDoc.id,
                    username: friendData.username,
                    books: friendData.books || [],
                    clubs: friendData.clubs || [],
                    createdAt: friendData.createdAt || new Date().toISOString()
                });
            }
        }
        
        console.log(`✅ Загружено ${friends.length} друзей`);
        
        updateFriendsDisplay();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки друзей:', error);
        showNotification('Ошибка загрузки друзей', 'error');
    }
}

async function loadFriendRequests() {
    if (!currentUser) return;
    
    try {
        console.log("📨 Загрузка запросов в друзья...");
        
        // Загружаем входящие запросы
        const incomingSnapshot = await db.collection('friendRequests')
            .where('receiverId', '==', currentUser.id)
            .where('status', '==', 'pending')
            .get();
        
        // Загружаем исходящие запросы
        const outgoingSnapshot = await db.collection('friendRequests')
            .where('senderId', '==', currentUser.id)
            .where('status', '==', 'pending')
            .get();
        
        friendRequests = [];
        
        incomingSnapshot.forEach(doc => {
            friendRequests.push({
                id: doc.id,
                ...doc.data(),
                type: 'incoming'
            });
        });
        
        // Добавляем исходящие запросы для проверки статуса
        outgoingSnapshot.forEach(doc => {
            friendRequests.push({
                id: doc.id,
                ...doc.data(),
                type: 'outgoing'
            });
        });
        
        console.log(`✅ Загружено ${friendRequests.length} запросов`);
        
        updateRequestsDisplay();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки запросов:', error);
        showNotification('Ошибка загрузки запросов', 'error');
    }
}

function updateFriendsDisplay() {
    const friendsList = document.getElementById('friendsList');
    const friendsCount = document.getElementById('friendsCount');
    
    if (!friendsList) {
        console.error('Элемент friendsList не найден');
        return;
    }
    
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
                    <p class="friend-meta">Книг: ${friend.books ? friend.books.length : 0}</p>
                    <p class="friend-meta">В клубах: ${friend.clubs ? friend.clubs.length : 0}</p>
                </div>
            </div>
            <div class="friend-actions">
                <button class="btn btn-outline btn-small view-friend-books" data-user-id="${friend.id}">
                    Книги
                </button>
                <button class="btn btn-outline btn-small remove-friend" data-user-id="${friend.id}">
                    Удалить
                </button>
            </div>
        </div>
    `).join('');
    
    if (friendsCount) friendsCount.textContent = friends.length;
    
    document.querySelectorAll('.view-friend-books').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await showUserBooks(userId);
        });
    });
    
    document.querySelectorAll('.remove-friend').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await removeFriend(userId);
        });
    });
}

function updateRequestsDisplay() {
    const requestsList = document.getElementById('requestsList');
    const requestsCount = document.getElementById('requestsCount');
    
    if (!requestsList) {
        console.error('Элемент requestsList не найден');
        return;
    }
    
    // Фильтруем только входящие запросы
    const incomingRequests = friendRequests.filter(r => r.type === 'incoming');
    
    if (incomingRequests.length === 0) {
        requestsList.innerHTML = '<p class="empty">Нет заявок в друзья</p>';
        if (requestsCount) requestsCount.textContent = '0';
        return;
    }
    
    requestsList.innerHTML = incomingRequests.map(request => `
        <div class="request-item">
            <div class="friend-info">
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div>
                    <h4>${request.senderName}</h4>
                    <p class="friend-meta">Хочет добавить вас в друзья</p>
                    <small>${request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Недавно'}</small>
                </div>
            </div>
            <div class="friend-actions">
                <button class="btn btn-primary btn-small accept-request" data-request-id="${request.id}" data-sender-id="${request.senderId}">
                    Принять
                </button>
                <button class="btn btn-outline btn-small decline-request" data-request-id="${request.id}">
                    Отклонить
                </button>
            </div>
        </div>
    `).join('');
    
    if (requestsCount) requestsCount.textContent = incomingRequests.length;
    
    document.querySelectorAll('.accept-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const requestId = e.target.dataset.requestId;
            const senderId = e.target.dataset.senderId;
            await handleFriendRequest(requestId, senderId, 'accept');
        });
    });
    
    document.querySelectorAll('.decline-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const requestId = e.target.dataset.requestId;
            await handleFriendRequest(requestId, null, 'decline');
        });
    });
}

async function handleFriendRequest(requestId, senderId, action) {
    if (!currentUser) return;
    
    try {
        console.log(`🔄 Обработка запроса в друзья: ${requestId}, действие: ${action}`);
        
        const requestDoc = await db.collection('friendRequests').doc(requestId).get();
        if (!requestDoc.exists) {
            throw new Error('Запрос не найден');
        }
        
        if (action === 'accept') {
            // Обновляем статус запроса
            await db.collection('friendRequests').doc(requestId).update({
                status: 'accepted'
            });
            
            // Добавляем друг другу в списки друзей
            await db.collection('users').doc(currentUser.id).update({
                friends: firebase.firestore.FieldValue.arrayUnion(senderId)
            });
            
            await db.collection('users').doc(senderId).update({
                friends: firebase.firestore.FieldValue.arrayUnion(currentUser.id)
            });
            
            showNotification('Заявка принята! Теперь вы друзья.', 'success');
        } else {
            // Отклоняем запрос
            await db.collection('friendRequests').doc(requestId).update({
                status: 'declined'
            });
            
            showNotification('Заявка отклонена', 'info');
        }
        
        // Обновляем данные
        await loadFriends();
        await loadFriendRequests();
        
        // Обновляем поиск, если он активен
        const searchInput = document.getElementById('friendSearch');
        if (searchInput && searchInput.value.trim()) {
            await searchFriends();
        }
        
    } catch (error) {
        console.error('Ошибка обработки запроса:', error);
        showNotification('Ошибка обработки заявки', 'error');
    }
}

async function removeFriend(friendId) {
    if (!confirm('Удалить из друзей?')) return;
    
    if (!currentUser) return;
    
    try {
        console.log(`🗑️ Удаление друга: ${friendId}`);
        
        // Удаляем из списка друзей текущего пользователя
        await db.collection('users').doc(currentUser.id).update({
            friends: firebase.firestore.FieldValue.arrayRemove(friendId)
        });
        
        // Удаляем из списка друзей другого пользователя
        await db.collection('users').doc(friendId).update({
            friends: firebase.firestore.FieldValue.arrayRemove(currentUser.id)
        });
        
        // Находим и удаляем запись о дружбе из коллекции friendRequests
        const snapshot = await db.collection('friendRequests')
            .where('senderId', 'in', [currentUser.id, friendId])
            .where('receiverId', 'in', [currentUser.id, friendId])
            .where('status', '==', 'accepted')
            .limit(1)
            .get();
        
        snapshot.forEach(async doc => {
            await db.collection('friendRequests').doc(doc.id).delete();
        });
        
        showNotification('Друг удален', 'info');
        
        await loadFriends();
        
        // Обновляем поиск, если он активен
        const searchInput = document.getElementById('friendSearch');
        if (searchInput && searchInput.value.trim()) {
            await searchFriends();
        }
        
    } catch (error) {
        console.error('Ошибка удаления друга:', error);
        showNotification('Ошибка удаления друга', 'error');
    }
}

// ==============================================
// НАСТРОЙКА СОБЫТИЙ
// ==============================================
function setupEventListeners() {
    console.log("⚙️ Настройка обработчиков событий...");
    
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
    
    // Модальное окно авторизации
    document.querySelector('.close').addEventListener('click', hideAuthModal);
    document.getElementById('authForm').addEventListener('submit', handleAuth);
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('authModal')) {
            hideAuthModal();
        }
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const submitText = document.getElementById('submitText');
            if (submitText) {
                submitText.textContent = tab === 'login' ? 'Войти' : 'Зарегистрироваться';
            }
        });
    });
    
    // Книги
    document.getElementById('addBookBtn').addEventListener('click', addBook);
    
    setupRatingStars();
    
    // Вкладки книг
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            updateBooksDisplay();
        });
    });
    
    // Клубы
    document.getElementById('createClubBtn').addEventListener('click', createClub);
    
    // Друзья
    document.getElementById('searchFriendBtn').addEventListener('click', searchFriends);
    
    const friendSearch = document.getElementById('friendSearch');
    if (friendSearch) {
        friendSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchFriends();
            }
        });
    }
    
    // Мобильное меню
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) navLinks.classList.toggle('active');
        });
    }
    
    // Сохраняем сессию при закрытии страницы
    window.addEventListener('beforeunload', () => {
        saveSession();
    });
    
    console.log("✅ Обработчики событий настроены");
}

// ==============================================
// ВОССТАНОВЛЕНИЕ СЕССИИ
// ==============================================
async function restoreUserSession(sessionData) {
    try {
        console.log("🔄 Восстановление сессии пользователя...");
        
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('username', '==', sessionData.username)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            throw new Error('Пользователь не найден');
        }
        
        let userData = null;
        let userId = null;
        
        snapshot.forEach(doc => {
            userData = doc.data();
            userId = doc.id;
        });
        
        currentUser = {
            id: userId,
            username: userData.username,
            password: userData.password,
            createdAt: userData.createdAt || new Date(),
            books: [],
            friends: [],
            clubs: [],
            friendRequests: []
        };
        
        console.log("✅ Сессия восстановлена для:", currentUser.username);
        
        updateUI();
        await loadUserData();
        switchPage('shelf');
        showNotification('Сессия восстановлена', 'info');
        
    } catch (error) {
        console.error('❌ Ошибка восстановления сессии:', error);
        localStorage.removeItem('bookShelfSession');
        showNotification('Ошибка восстановления сессии', 'error');
    }
}

// ==============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ==============================================
async function init() {
    console.log("🚀 Запуск приложения BookShelf");
    
    try {
        // Создаем демо-пользователя при первом запуске
        await initDemoData();
        
        const sessionData = restoreSession();
        if (sessionData) {
            console.log("🔄 Обнаружена сохраненная сессия");
            await restoreUserSession(sessionData);
        } else {
            console.log("🆕 Нет сохраненной сессии, начинаем с главной страницы");
            switchPage('home');
        }
        
        setupEventListeners();
        console.log("🎉 Приложение готово к работе!");
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        showNotification('Ошибка запуска приложения: ' + error.message, 'error');
    }
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ ДЕМО-ДАННЫХ
// ==============================================
async function initDemoData() {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('username', '==', 'demo').limit(1).get();
        
        if (snapshot.empty) {
            console.log("👤 Создаем демо-пользователя...");
            
            const demoUser = {
                username: 'demo',
                password: 'demo123',
                createdAt: new Date().toISOString(),
                books: [],
                friends: [],
                clubs: [],
                friendRequests: []
            };
            
            await usersRef.add(demoUser);
            console.log("✅ Демо-пользователь создан: demo / demo123");
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации демо-данных:', error);
    }
}

// Запускаем приложение
document.addEventListener('DOMContentLoaded', init);
