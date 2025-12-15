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
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase инициализирован");
} catch (error) {
    console.error("❌ Ошибка Firebase:", error);
}

const db = firebase.firestore();

// ==============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==============================================
let currentUser = null;
let currentRating = 0;
let userBooks = [];
let allUsers = []; // Все пользователи для поиска
let friends = []; // Текущие друзья
let friendRequests = []; // Запросы в друзья

// ==============================================
// УТИЛИТЫ
// ==============================================
function showNotification(message, type = 'info') {
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
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Стили для анимации
const style = document.createElement('style');
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

function switchPage(pageId) {
    console.log(`📄 Переход на: ${pageId}`);
    
    // Скрыть все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    // Показать выбранную страницу
    const page = document.getElementById(pageId + 'Page');
    if (page) {
        page.style.display = 'block';
        page.classList.add('active');
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
                loadAllUsers(); // Загружаем всех пользователей для поиска
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
        
        currentUser = { id: userId, ...userData };
        
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
        // Проверяем существование пользователя
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('username', '==', username)
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            throw new Error('Пользователь уже существует');
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
        
        const docRef = await usersRef.add(userData);
        currentUser = { id: docRef.id, ...userData };
        
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
    userBooks = [];
    friends = [];
    friendRequests = [];
    allUsers = [];
    
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
        if (currentUserSpan) currentUserSpan.textContent = currentUser.username;
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
        
        const docRef = await db.collection('books').add(bookData);
        bookData.id = docRef.id;
        
        // Добавляем ID книги пользователю
        await db.collection('users').doc(currentUser.id).update({
            books: firebase.firestore.FieldValue.arrayUnion(docRef.id)
        });
        
        // Добавляем в локальный массив
        userBooks.push(bookData);
        
        // Очищаем форму
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookAuthor').value = '';
        document.getElementById('bookReview').value = '';
        setRating(0);
        
        // Обновляем отображение
        updateBooksDisplay();
        updateBookCounts();
        
        showNotification('Книга добавлена!', 'success');
        
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

async function loadBooks() {
    if (!currentUser) return;
    
    try {
        const booksRef = db.collection('books');
        const snapshot = await booksRef
            .where('userId', '==', currentUser.id)
            .orderBy('createdAt', 'desc')
            .get();
        
        userBooks = [];
        snapshot.forEach(doc => {
            userBooks.push({ id: doc.id, ...doc.data() });
        });
        
        updateBooksDisplay();
        updateBookCounts();
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

function updateBooksDisplay() {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    if (userBooks.length === 0) {
        booksGrid.innerHTML = '<p class="empty">Пока нет книг. Добавьте первую!</p>';
        return;
    }
    
    // Фильтруем по активной вкладке
    const activeTab = document.querySelector('.tab.active');
    const status = activeTab ? activeTab.dataset.status : 'read';
    const filteredBooks = userBooks.filter(book => book.status === status);
    
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

function updateBookCounts() {
    if (!currentUser) return;
    
    const total = userBooks.length;
    const read = userBooks.filter(b => b.status === 'read').length;
    const reading = userBooks.filter(b => b.status === 'reading').length;
    const want = userBooks.filter(b => b.status === 'want').length;
    
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
        
        if (!clubData) throw new Error('Клуб не найден');
        
        const isMember = clubData.members && clubData.members.includes(currentUser.id);
        
        if (isMember) {
            await db.collection('clubs').doc(clubId).update({
                members: firebase.firestore.FieldValue.arrayRemove(currentUser.id),
                membersCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            await db.collection('users').doc(currentUser.id).update({
                clubs: firebase.firestore.FieldValue.arrayRemove(clubId)
            });
            
            showNotification('Вы вышли из клуба', 'info');
        } else {
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
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

// ==============================================
// ДРУЗЬЯ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ==============================================

// Загрузка всех пользователей для поиска
async function loadAllUsers() {
    if (!currentUser) return;
    
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        
        allUsers = [];
        snapshot.forEach(doc => {
            const userData = doc.data();
            // Исключаем текущего пользователя
            if (doc.id !== currentUser.id) {
                allUsers.push({
                    id: doc.id,
                    ...userData
                });
            }
        });
        
        console.log(`Загружено ${allUsers.length} пользователей для поиска`);
        
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        showNotification('Ошибка загрузки пользователей', 'error');
    }
}

// Поиск друзей по никнейму
async function searchFriends() {
    const searchInput = document.getElementById('friendSearch');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        showNotification('Введите никнейм для поиска', 'warning');
        return;
    }
    
    // Ищем среди всех загруженных пользователей
    const results = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm)
    );
    
    displaySearchResults(results);
}

// Отображение результатов поиска
function displaySearchResults(users) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    if (users.length === 0) {
        searchResults.innerHTML = '<p class="empty">Пользователи не найдены</p>';
        return;
    }
    
    searchResults.innerHTML = users.map(user => {
        // Проверяем статус отношений
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
    
    // Добавляем обработчики событий
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

// Показать профиль пользователя
async function showUserProfile(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const userData = userDoc.data();
        
        // Создаем модальное окно для профиля
        const profileModal = document.createElement('div');
        profileModal.className = 'modal';
        profileModal.style.display = 'flex';
        
        profileModal.innerHTML = `
            <div class="modal-content">
                <span class="close-profile">&times;</span>
                <h2><i class="fas fa-user"></i> Профиль пользователя</h2>
                
                <div class="profile-header">
                    <div class="profile-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="profile-info">
                        <h3>${userData.username}</h3>
                        <p><i class="fas fa-calendar"></i> В BookShelf с: ${new Date(userData.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <i class="fas fa-book"></i>
                        <div>
                            <h4>${userData.books ? userData.books.length : 0}</h4>
                            <p>Книг на полке</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-users"></i>
                        <div>
                            <h4>${userData.friends ? userData.friends.length : 0}</h4>
                            <p>Друзей</p>
                        </div>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-club"></i>
                        <div>
                            <h4>${userData.clubs ? userData.clubs.length : 0}</h4>
                            <p>Клубов</p>
                        </div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    ${friends.some(f => f.id === userId) ? 
                        '<button class="btn btn-outline btn-block remove-friend-profile" data-user-id="' + userId + '">Удалить из друзей</button>' :
                        '<button class="btn btn-primary btn-block add-friend-profile" data-user-id="' + userId + '">Добавить в друзья</button>'
                    }
                </div>
            </div>
        `;
        
        document.body.appendChild(profileModal);
        
        // Закрытие модального окна
        profileModal.querySelector('.close-profile').addEventListener('click', () => {
            profileModal.remove();
        });
        
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                profileModal.remove();
            }
        });
        
        // Обработчики кнопок в профиле
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

// Отправить запрос в друзья
async function sendFriendRequest(friendId) {
    if (!currentUser) return;
    
    try {
        // Проверяем, не отправили ли уже запрос
        const existingRequest = await db.collection('friends')
            .where('senderId', '==', currentUser.id)
            .where('receiverId', '==', friendId)
            .where('status', 'in', ['pending', 'accepted'])
            .limit(1)
            .get();
        
        if (!existingRequest.empty) {
            showNotification('Запрос уже отправлен', 'warning');
            return;
        }
        
        const requestData = {
            senderId: currentUser.id,
            senderName: currentUser.username,
            receiverId: friendId,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        await db.collection('friends').add(requestData);
        
        showNotification('Запрос в друзья отправлен', 'success');
        
        // Обновляем отображение
        await loadFriendRequests();
        
    } catch (error) {
        console.error('Ошибка отправки запроса:', error);
        showNotification('Ошибка отправки запроса', 'error');
    }
}

// Загрузка друзей
async function loadFriends() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.id).get();
        const userData = userDoc.data();
        const friendIds = userData?.friends || [];
        
        // Загружаем информацию о друзьях
        friends = [];
        for (const friendId of friendIds) {
            const friendDoc = await db.collection('users').doc(friendId).get();
            if (friendDoc.exists) {
                friends.push({
                    id: friendDoc.id,
                    ...friendDoc.data()
                });
            }
        }
        
        updateFriendsDisplay();
        
    } catch (error) {
        console.error('Ошибка загрузки друзей:', error);
        showNotification('Ошибка загрузки друзей', 'error');
    }
}

// Загрузка запросов в друзья
async function loadFriendRequests() {
    if (!currentUser) return;
    
    try {
        // Входящие запросы
        const incomingRequests = await db.collection('friends')
            .where('receiverId', '==', currentUser.id)
            .where('status', '==', 'pending')
            .get();
        
        friendRequests = [];
        incomingRequests.forEach(doc => {
            friendRequests.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateRequestsDisplay();
        
    } catch (error) {
        console.error('Ошибка загрузки запросов:', error);
    }
}

// Обновление отображения друзей
function updateFriendsDisplay() {
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
    
    // Обработчики для кнопок
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

// Обновление отображения запросов
function updateRequestsDisplay() {
    const requestsList = document.getElementById('requestsList');
    const requestsCount = document.getElementById('requestsCount');
    
    if (!requestsList) return;
    
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
                    <small>${new Date(request.createdAt).toLocaleDateString()}</small>
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
    
    // Обработчики для кнопок запросов
    document.querySelectorAll('.accept-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const requestId = e.target.dataset.requestId;
            await handleFriendRequest(requestId, 'accept');
        });
    });
    
    document.querySelectorAll('.decline-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const requestId = e.target.dataset.requestId;
            await handleFriendRequest(requestId, 'decline');
        });
    });
}

// Обработка запроса в друзья
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
        
    } catch (error) {
        console.error('Ошибка обработки запроса:', error);
        showNotification('Ошибка обработки заявки', 'error');
    }
}

// Удалить друга
async function removeFriend(friendId) {
    if (!confirm('Удалить из друзей?')) return;
    
    try {
        // Удаляем друг у друга из списков друзей
        await db.collection('users').doc(currentUser.id).update({
            friends: firebase.firestore.FieldValue.arrayRemove(friendId)
        });
        
        await db.collection('users').doc(friendId).update({
            friends: firebase.firestore.FieldValue.arrayRemove(currentUser.id)
        });
        
        // Находим и удаляем запись о дружбе
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
        
        // Обновляем данные
        await loadFriends();
        
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
    
    // Модальное окно
    document.querySelector('.close').addEventListener('click', hideAuthModal);
    document.getElementById('authForm').addEventListener('submit', handleAuth);
    
    // Закрытие модального окна по клику вне его
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('authModal')) {
            hideAuthModal();
        }
    });
    
    // Вкладки в модальном окне
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
    
    // Звезды рейтинга
    setupRatingStars();
    
    // Вкладки полок
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
    
    // Поиск по Enter
    document.getElementById('friendSearch')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchFriends();
        }
    });
    
    // Мобильное меню
    document.querySelector('.menu-toggle').addEventListener('click', function() {
        document.querySelector('.nav-links').classList.toggle('active');
    });
    
    console.log("✅ Обработчики событий настроены");
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
            console.log("👤 Создаем демо-пользователя...");
            
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
            console.log("✅ Демо-пользователь создан");
        }
        
    } catch (error) {
        console.error('❌ Ошибка инициализации демо-данных:', error);
    }
}

// ==============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ==============================================
async function init() {
    console.log("🚀 Запуск приложения BookShelf");
    
    // Инициализируем демо-данные
    await initDemoData();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    console.log("🎉 Приложение готово к работе!");
}

// Запускаем приложение
document.addEventListener('DOMContentLoaded', init);
