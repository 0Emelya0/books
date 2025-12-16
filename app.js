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
try {
    // Проверяем, не инициализирован ли Firebase уже
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log("✅ Firebase инициализирован");
} catch (error) {
    console.error("❌ Ошибка Firebase:", error);
}

// Инициализация Firestore с совместимостью
let db;
try {
    if (firebase.firestore) {
        db = firebase.firestore();
        // Включаем поддержку timestamps
        const settings = { timestampsInSnapshots: true };
        db.settings(settings);
        console.log("✅ Firestore инициализирован");
    } else {
        console.error("❌ Firestore не доступен");
    }
} catch (error) {
    console.error("❌ Ошибка инициализации Firestore:", error);
}

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
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
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
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
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
        console.log("💾 Сессия сохранена");
    }
}

function restoreSession() {
    const sessionData = localStorage.getItem('bookShelfSession');
    if (sessionData) {
        try {
            const data = JSON.parse(sessionData);
            // Проверяем, не устарела ли сессия (24 часа)
            if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                console.log("🔄 Восстановление сессии для:", data.username);
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
    
    // Скрыть все страницы
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    // Показать выбранную страницу
    const page = document.getElementById(pageId + 'Page');
    if (page) {
        page.style.display = 'block';
        setTimeout(() => {
            page.classList.add('active');
        }, 10);
        document.body.className = `${pageId}-page`;
    }
    
    // Обновить навигацию
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });
    
    // Загрузить данные для страницы
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
// АВТОРИЗАЦИЯ (С СОХРАНЕНИЕМ СЕССИИ)
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
    
    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
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
        
        if (!db) {
            throw new Error('База данных не инициализирована');
        }
        
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
        
        // Получаем полные данные пользователя
        const fullUserData = await getUserFullData(userId);
        
        currentUser = {
            id: userId,
            username: userData.username,
            createdAt: userData.createdAt,
            ...fullUserData
        };
        
        console.log("👤 Пользователь загружен:", currentUser.username);
        
        // Сохраняем сессию
        saveSession();
        
        // Обновляем интерфейс
        updateUI();
        hideAuthModal();
        switchPage('shelf');
        
        showNotification(`Добро пожаловать, ${username}!`, 'success');
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        throw new Error('Ошибка входа: ' + error.message);
    }
}

async function getUserFullData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error('Пользователь не найден');
        }
        
        const userData = userDoc.data();
        
        // Получаем книги пользователя
        const booksSnapshot = await db.collection('books')
            .where('userId', '==', userId)
            .get();
        
        const books = [];
        booksSnapshot.forEach(doc => {
            const bookData = doc.data();
            books.push({ 
                id: doc.id, 
                ...bookData,
                createdAt: bookData.createdAt ? bookData.createdAt.toDate() : new Date()
            });
        });
        
        // Получаем друзей
        const friends = userData.friends || [];
        const friendDetails = [];
        
        // Получаем запросы в друзья
        const requestsSnapshot = await db.collection('friends')
            .where('receiverId', '==', userId)
            .where('status', '==', 'pending')
            .get();
        
        const friendRequests = [];
        requestsSnapshot.forEach(doc => {
            const requestData = doc.data();
            friendRequests.push({ 
                id: doc.id, 
                ...requestData,
                createdAt: requestData.createdAt ? requestData.createdAt.toDate() : new Date()
            });
        });
        
        return {
            books: books,
            friends: friends,
            friendDetails: friendDetails,
            clubs: userData.clubs || [],
            friendRequests: friendRequests
        };
        
    } catch (error) {
        console.error("Ошибка загрузки данных пользователя:", error);
        return {
            books: [],
            friends: [],
            friendDetails: [],
            clubs: [],
            friendRequests: []
        };
    }
}

async function registerUser(username, password) {
    try {
        console.log(`📝 Регистрация нового пользователя: ${username}`);
        
        if (!db) {
            throw new Error('База данных не инициализирована');
        }
        
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            books: [],
            friends: [],
            clubs: [],
            friendRequests: []
        };
        
        const docRef = await usersRef.add(userData);
        currentUser = {
            id: docRef.id,
            ...userData,
            createdAt: new Date()
        };
        
        // Сохраняем сессию
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
    
    // Удаляем сессию
    localStorage.removeItem('bookShelfSession');
    
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (authButtons) authButtons.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    
    switchPage('home');
    showNotification('Вы вышли из системы', 'info');
}

function updateUI() {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    const userName = document.getElementById('userName');
    const currentUserSpan = document.getElementById('currentUser');
    
    if (currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        
        if (userName) userName.textContent = currentUser.username;
        if (currentUserSpan) currentUserSpan.textContent = currentUser.username;
    }
}

// ==============================================
// КНИГИ (С ПОЛНОЙ ЗАГРУЗКОЙ ПРИ ОБНОВЛЕНИИ)
// ==============================================
function setupRatingStars() {
    const stars = document.querySelectorAll('.stars i');
    if (!stars.length) {
        console.warn('Звезды рейтинга не найдены');
        return;
    }
    
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
        if (!db) {
            throw new Error('База данных не инициализирована');
        }
        
        const bookData = {
            title: title,
            author: author,
            status: status,
            genre: genre,
            review: review,
            rating: rating,
            userId: currentUser.id,
            username: currentUser.username,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log("📚 Добавление книги:", bookData);
        
        // Добавляем книгу в Firestore
        const docRef = await db.collection('books').add(bookData);
        const bookId = docRef.id;
        
        // Добавляем ID книги пользователю
        await db.collection('users').doc(currentUser.id).update({
            books: firebase.firestore.FieldValue.arrayUnion(bookId)
        });
        
        // Добавляем книгу в локальный массив
        userBooks.push({
            id: bookId,
            ...bookData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Очищаем форму
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookAuthor').value = '';
        document.getElementById('bookReview').value = '';
        setRating(0);
        
        // Обновляем отображение
        updateBooksDisplay();
        updateBookCounts();
        
        // Сохраняем изменения
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
    
    if (!db) {
        console.error("❌ База данных не инициализирована");
        showNotification('Ошибка базы данных', 'error');
        return;
    }
    
    try {
        // Загружаем книги из Firestore
        const booksRef = db.collection('books');
        const snapshot = await booksRef
            .where('userId', '==', currentUser.id)
            .get();
        
        userBooks = [];
        snapshot.forEach(doc => {
            const bookData = doc.data();
            userBooks.push({
                id: doc.id,
                ...bookData,
                // Преобразуем timestamp в Date
                createdAt: bookData.createdAt ? bookData.createdAt.toDate() : new Date(),
                updatedAt: bookData.updatedAt ? bookData.updatedAt.toDate() : new Date()
            });
        });
        
        console.log(`📚 Загружено ${userBooks.length} книг из Firestore`);
        
        // Сортируем по дате создания (новые первыми)
        userBooks.sort((a, b) => b.createdAt - a.createdAt);
        
        // Обновляем данные пользователя
        currentUser.books = userBooks;
        saveSession();
        
        // Обновляем отображение
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
    
    // Фильтруем по активной вкладке
    const activeTab = document.querySelector('.tab.active');
    let status = 'read'; // значение по умолчанию
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
        const date = book.createdAt instanceof Date ? book.createdAt : new Date(book.createdAt);
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
        
        // Устанавливаем нулевые значения
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
    
    if (!db) {
        showNotification('Ошибка базы данных', 'error');
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
    if (!db) return;
    
    try {
        const clubsRef = db.collection('clubs');
        const snapshot = await clubsRef.orderBy('createdAt', 'desc').get();
        
        const clubs = [];
        snapshot.forEach(doc => {
            const clubData = doc.data();
            clubs.push({ 
                id: doc.id, 
                ...clubData,
                createdAt: clubData.createdAt ? clubData.createdAt.toDate() : new Date()
            });
        });
        
        updateClubsDisplay(clubs);
        
    } catch (error) {
        console.error('Ошибка загрузки клубов:', error);
    }
}

async function loadMyClubs() {
    if (!currentUser || !db) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.id).get();
        const userData = userDoc.data();
        const clubIds = userData?.clubs || [];
        
        const myClubs = [];
        for (const clubId of clubIds) {
            const clubDoc = await db.collection('clubs').doc(clubId).get();
            if (clubDoc.exists) {
                const clubData = clubDoc.data();
                myClubs.push({ 
                    id: clubDoc.id, 
                    ...clubData,
                    createdAt: clubData.createdAt ? clubData.createdAt.toDate() : new Date()
                });
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
                <p class="club-meta">Участников: ${club.membersCount || 0}</p>
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
        <div class="club-card">
            <h4>${club.name}</h4>
            <p class="club-meta">Жанр: ${club.genre}</p>
            <p>${club.description}</p>
            <div class="club-actions">
                <span class="badge">${club.membersCount || 0} участников</span>
            </div>
        </div>
    `).join('');
}

async function joinClub(clubId) {
    if (!currentUser) {
        showNotification('Войдите в систему', 'error');
        return;
    }
    
    if (!db) {
        showNotification('Ошибка базы данных', 'error');
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
            // Выходим из клуба
            await db.collection('clubs').doc(clubId).update({
                members: firebase.firestore.FieldValue.arrayRemove(currentUser.id),
                membersCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            await db.collection('users').doc(currentUser.id).update({
                clubs: firebase.firestore.FieldValue.arrayRemove(clubId)
            });
            
            showNotification('Вы вышли из клуба', 'info');
        } else {
            // Вступаем в клуб
            await db.collection('clubs').doc(clubId).update({
                members: firebase.firestore.FieldValue.arrayUnion(currentUser.id),
                membersCount: firebase.firestore.FieldValue.increment(1)
            });
            
            await db.collection('users').doc(currentUser.id).update({
                clubs: firebase.firestore.FieldValue.arrayUnion(clubId)
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
// ДРУЗЬЯ
// ==============================================
async function loadAllUsers() {
    if (!currentUser || !db) return;
    
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        
        allUsers = [];
        snapshot.forEach(doc => {
            const userData = doc.data();
            if (doc.id !== currentUser.id) {
                allUsers.push({
                    id: doc.id,
                    ...userData,
                    createdAt: userData.createdAt ? userData.createdAt.toDate() : new Date()
                });
            }
        });
        
        console.log(`👥 Загружено ${allUsers.length} пользователей для поиска`);
        
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
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
    
    if (allUsers.length === 0) {
        await loadAllUsers();
    }
    
    const results = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm)
    );
    
    displaySearchResults(results);
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
            (r.senderId === user.id && r.receiverId === currentUser.id) ||
            (r.senderId === currentUser.id && r.receiverId === user.id)
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
                        <p>Книг на полке: ${user.books ? user.books.length : 0}</p>
                        <p>В клубах: ${user.clubs ? user.clubs.length : 0}</p>
                    </div>
                </div>
                <div class="friend-actions">
                    ${buttonHtml}
                    <button class="btn btn-outline btn-small view-profile" data-user-id="${user.id}">
                        Профиль
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.send-friend-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await sendFriendRequest(userId);
        });
    });
    
    document.querySelectorAll('.view-profile').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await showUserProfile(userId);
        });
    });
}

async function showUserProfile(userId) {
    try {
        if (!db) {
            showNotification('Ошибка базы данных', 'error');
            return;
        }
        
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const userData = userDoc.data();
        
        // Получаем книги пользователя
        const booksSnapshot = await db.collection('books')
            .where('userId', '==', userId)
            .get();
        const booksCount = booksSnapshot.size;
        
        const profileModal = document.createElement('div');
        profileModal.className = 'modal';
        profileModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        profileModal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 20px;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            ">
                <span class="close-profile" style="
                    float: right;
                    font-size: 24px;
                    cursor: pointer;
                ">&times;</span>
                <h2><i class="fas fa-user"></i> Профиль пользователя</h2>
                
                <div class="profile-header" style="display: flex; align-items: center; margin-bottom: 20px;">
                    <div class="profile-avatar" style="font-size: 48px; margin-right: 20px;">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="profile-info">
                        <h3>${userData.username}</h3>
                        <p><i class="fas fa-calendar"></i> В BookShelf с: ${userData.createdAt ? userData.createdAt.toDate().toLocaleDateString() : 'Неизвестно'}</p>
                    </div>
                </div>
                
                <div class="profile-stats" style="display: flex; justify-content: space-around; margin: 20px 0;">
                    <div class="stat-item" style="text-align: center;">
                        <i class="fas fa-book" style="font-size: 24px; color: #4CAF50;"></i>
                        <div>
                            <h4>${booksCount}</h4>
                            <p>Книг на полке</p>
                        </div>
                    </div>
                    <div class="stat-item" style="text-align: center;">
                        <i class="fas fa-users" style="font-size: 24px; color: #2196F3;"></i>
                        <div>
                            <h4>${userData.friends ? userData.friends.length : 0}</h4>
                            <p>Друзей</p>
                        </div>
                    </div>
                    <div class="stat-item" style="text-align: center;">
                        <i class="fas fa-users" style="font-size: 24px; color: #9C27B0;"></i>
                        <div>
                            <h4>${userData.clubs ? userData.clubs.length : 0}</h4>
                            <p>Клубов</p>
                        </div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    ${friends.some(f => f.id === userId) ? 
                        '<button class="btn btn-outline btn-block remove-friend-profile" data-user-id="' + userId + '" style="width: 100%; padding: 10px; margin-top: 10px;">Удалить из друзей</button>' :
                        '<button class="btn btn-primary btn-block add-friend-profile" data-user-id="' + userId + '" style="width: 100%; padding: 10px; margin-top: 10px;">Добавить в друзья</button>'
                    }
                </div>
            </div>
        `;
        
        document.body.appendChild(profileModal);
        
        profileModal.querySelector('.close-profile').addEventListener('click', () => {
            profileModal.remove();
        });
        
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.remove();
            }
        });
        
        const addFriendBtn = profileModal.querySelector('.add-friend-profile');
        const removeFriendBtn = profileModal.querySelector('.remove-friend-profile');
        
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', async () => {
                await sendFriendRequest(userId);
                profileModal.remove();
            });
        }
        
        if (removeFriendBtn) {
            removeFriendBtn.addEventListener('click', async () => {
                await removeFriend(userId);
                profileModal.remove();
            });
        }
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showNotification('Ошибка загрузки профиля', 'error');
    }
}

async function sendFriendRequest(friendId) {
    if (!currentUser || !db) return;
    
    try {
        // Проверяем, не отправили ли уже запрос
        const existingRequest = await db.collection('friends')
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
        const isAlreadyFriend = await checkIfFriends(currentUser.id, friendId);
        if (isAlreadyFriend) {
            showNotification('Вы уже друзья', 'warning');
            return;
        }
        
        const requestData = {
            senderId: currentUser.id,
            senderName: currentUser.username,
            receiverId: friendId,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('friends').add(requestData);
        
        showNotification('Запрос в друзья отправлен', 'success');
        
        await loadFriendRequests();
        
    } catch (error) {
        console.error('Ошибка отправки запроса:', error);
        showNotification('Ошибка отправки запроса', 'error');
    }
}

async function checkIfFriends(userId1, userId2) {
    try {
        const user1Doc = await db.collection('users').doc(userId1).get();
        const user1Data = user1Doc.data();
        
        return user1Data.friends && user1Data.friends.includes(userId2);
    } catch (error) {
        console.error('Ошибка проверки дружбы:', error);
        return false;
    }
}

async function loadFriends() {
    if (!currentUser || !db) return;
    
    try {
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
                    ...friendData,
                    createdAt: friendData.createdAt ? friendData.createdAt.toDate() : new Date()
                });
            }
        }
        
        console.log(`👥 Загружено ${friends.length} друзей из Firestore`);
        
        // Обновляем данные пользователя
        currentUser.friendDetails = friends;
        saveSession();
        
        updateFriendsDisplay();
        
    } catch (error) {
        console.error('Ошибка загрузки друзей:', error);
    }
}

async function loadFriendRequests() {
    if (!currentUser || !db) return;
    
    try {
        const requestsSnapshot = await db.collection('friends')
            .where('receiverId', '==', currentUser.id)
            .where('status', '==', 'pending')
            .get();
        
        friendRequests = [];
        requestsSnapshot.forEach(doc => {
            const requestData = doc.data();
            friendRequests.push({
                id: doc.id,
                ...requestData,
                createdAt: requestData.createdAt ? requestData.createdAt.toDate() : new Date()
            });
        });
        
        console.log(`📨 Загружено ${friendRequests.length} запросов из Firestore`);
        
        // Обновляем данные пользователя
        currentUser.friendRequests = friendRequests;
        saveSession();
        
        updateRequestsDisplay();
        
    } catch (error) {
        console.error('Ошибка загрузки запросов:', error);
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
                    <p>Книг: ${friend.books ? friend.books.length : 0}</p>
                    <p>В клубах: ${friend.clubs ? friend.clubs.length : 0}</p>
                </div>
            </div>
            <div class="friend-actions">
                <button class="btn btn-outline btn-small view-friend-profile" data-user-id="${friend.id}">
                    Профиль
                </button>
                <button class="btn btn-outline btn-small remove-friend" data-user-id="${friend.id}">
                    Удалить
                </button>
            </div>
        </div>
    `).join('');
    
    if (friendsCount) friendsCount.textContent = friends.length;
    
    document.querySelectorAll('.view-friend-profile').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await showUserProfile(userId);
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
    
    if (friendRequests.length === 0) {
        requestsList.innerHTML = '<p class="empty">Нет заявок в друзья</p>';
        if (requestsCount) requestsCount.textContent = '0';
        return;
    }
    
    requestsList.innerHTML = friendRequests.map(request => `
        <div class="request-item">
            <div class="friend-info">
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div>
                    <h4>${request.senderName}</h4>
                    <p>Хочет добавить вас в друзья</p>
                    <small>${request.createdAt ? request.createdAt.toLocaleDateString() : 'Недавно'}</small>
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
    
    if (requestsCount) requestsCount.textContent = friendRequests.length;
    
    document.querySelectorAll('.accept-request, .decline-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const requestId = e.target.dataset.requestId;
            const action = e.target.classList.contains('accept-request') ? 'accept' : 'decline';
            await handleFriendRequest(requestId, action);
        });
    });
}

async function handleFriendRequest(requestId, action) {
    if (!currentUser || !db) return;
    
    try {
        const requestDoc = await db.collection('friends').doc(requestId).get();
        if (!requestDoc.exists) {
            throw new Error('Запрос не найден');
        }
        
        const requestData = requestDoc.data();
        
        if (action === 'accept') {
            // Обновляем статус запроса
            await db.collection('friends').doc(requestId).update({
                status: 'accepted'
            });
            
            // Добавляем друг другу в списки друзей
            await db.collection('users').doc(currentUser.id).update({
                friends: firebase.firestore.FieldValue.arrayUnion(requestData.senderId)
            });
            
            await db.collection('users').doc(requestData.senderId).update({
                friends: firebase.firestore.FieldValue.arrayUnion(currentUser.id)
            });
            
            showNotification('Заявка принята! Теперь вы друзья.', 'success');
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
        
        // Сохраняем изменения
        saveSession();
        
    } catch (error) {
        console.error('Ошибка обработки запроса:', error);
        showNotification('Ошибка обработки заявки', 'error');
    }
}

async function removeFriend(friendId) {
    if (!confirm('Удалить из друзей?')) return;
    
    if (!currentUser || !db) return;
    
    try {
        // Удаляем из списка друзей текущего пользователя
        await db.collection('users').doc(currentUser.id).update({
            friends: firebase.firestore.FieldValue.arrayRemove(friendId)
        });
        
        // Удаляем из списка друзей другого пользователя
        await db.collection('users').doc(friendId).update({
            friends: firebase.firestore.FieldValue.arrayRemove(currentUser.id)
        });
        
        // Обновляем или удаляем запись в коллекции friends
        const friendsRef = db.collection('friends');
        const snapshot = await friendsRef
            .where('senderId', 'in', [currentUser.id, friendId])
            .where('receiverId', 'in', [currentUser.id, friendId])
            .where('status', '==', 'accepted')
            .limit(1)
            .get();
        
        snapshot.forEach(async doc => {
            await db.collection('friends').doc(doc.id).update({ status: 'removed' });
        });
        
        showNotification('Друг удален', 'info');
        
        await loadFriends();
        saveSession();
        
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
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const startBtn = document.getElementById('startBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) loginBtn.addEventListener('click', () => showAuthModal('login'));
    if (registerBtn) registerBtn.addEventListener('click', () => showAuthModal('register'));
    if (startBtn) startBtn.addEventListener('click', () => showAuthModal('login'));
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // Модальное окно авторизации
    const closeBtn = document.querySelector('.close');
    const authForm = document.getElementById('authForm');
    
    if (closeBtn) closeBtn.addEventListener('click', hideAuthModal);
    if (authForm) authForm.addEventListener('submit', handleAuth);
    
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
    const addBookBtn = document.getElementById('addBookBtn');
    if (addBookBtn) addBookBtn.addEventListener('click', addBook);
    
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
    const createClubBtn = document.getElementById('createClubBtn');
    if (createClubBtn) createClubBtn.addEventListener('click', createClub);
    
    // Друзья
    const searchFriendBtn = document.getElementById('searchFriendBtn');
    if (searchFriendBtn) searchFriendBtn.addEventListener('click', searchFriends);
    
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
// ИНИЦИАЛИЗАЦИЯ ДЕМО-ДАННЫХ
// ==============================================
async function initDemoData() {
    try {
        if (!db) {
            console.warn('База данных не инициализирована, пропускаем создание демо-данных');
            return;
        }
        
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('username', '==', 'demo').limit(1).get();
        
        if (snapshot.empty) {
            console.log("👤 Создаем демо-пользователя...");
            
            const demoUser = {
                username: 'demo',
                password: 'demo123',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                books: [],
                friends: [],
                clubs: [],
                friendRequests: []
            };
            
            await usersRef.add(demoUser);
            console.log("✅ Демо-пользователь создан");
        } else {
            console.log("✅ Демо-пользователь уже существует");
        }
        
    } catch (error) {
        console.error('❌ Ошибка инициализации демо-данных:', error);
    }
}

// ==============================================
// ВОССТАНОВЛЕНИЕ СЕССИИ
// ==============================================
async function restoreUserSession(sessionData) {
    try {
        console.log("🔄 Восстановление сессии пользователя...");
        
        if (!db) {
            throw new Error('База данных не инициализирована');
        }
        
        // Получаем данные пользователя из Firestore
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
        
        // Получаем полные данные пользователя
        const fullUserData = await getUserFullData(userId);
        
        currentUser = {
            id: userId,
            username: userData.username,
            password: userData.password,
            createdAt: userData.createdAt ? userData.createdAt.toDate() : new Date(),
            ...fullUserData
        };
        
        console.log("✅ Сессия восстановлена для:", currentUser.username);
        
        // Обновляем интерфейс
        updateUI();
        switchPage('shelf');
        
        // Загружаем книги
        loadBooks();
        
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
        // Инициализируем демо-данные
        await initDemoData();
        
        // Проверяем сохраненную сессию
        const sessionData = restoreSession();
        if (sessionData) {
            console.log("🔄 Обнаружена сохраненная сессия");
            await restoreUserSession(sessionData);
        } else {
            console.log("🆕 Нет сохраненной сессии, начинаем с главной страницы");
            switchPage('home');
        }
        
        // Настраиваем обработчики событий
        setupEventListeners();
        
        console.log("🎉 Приложение готово к работе!");
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        showNotification('Ошибка запуска приложения: ' + error.message, 'error');
    }
}

// Запускаем приложение
document.addEventListener('DOMContentLoaded', init);
