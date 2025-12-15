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
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ==============================================
let currentUser = null;
let currentRating = 0;
let currentBooks = [];
let currentClubs = [];
let currentFriends = [];
let currentRequests = [];

// ==============================================
// DOM ЭЛЕМЕНТЫ
// ==============================================
const elements = {
    // Навигация
    homeLink: document.getElementById('homeLink'),
    shelfLink: document.getElementById('shelfLink'),
    clubsLink: document.getElementById('clubsLink'),
    friendsLink: document.getElementById('friendsLink'),
    
    // Авторизация
    authButtons: document.getElementById('authButtons'),
    userMenu: document.getElementById('userMenu'),
    userName: document.getElementById('userName'),
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    startBtn: document.getElementById('startBtn'),
    welcomeLoginBtn: document.getElementById('welcomeLoginBtn'),
    
    // Модальное окно
    authModal: document.getElementById('authModal'),
    closeModal: document.querySelector('.close'),
    authForm: document.getElementById('authForm'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    email: document.getElementById('email'),
    emailField: document.getElementById('emailField'),
    submitText: document.getElementById('submitText'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    
    // Книги
    currentUser: document.getElementById('currentUser'),
    bookCount: document.getElementById('bookCount'),
    bookTitle: document.getElementById('bookTitle'),
    bookAuthor: document.getElementById('bookAuthor'),
    bookStatus: document.getElementById('bookStatus'),
    bookGenre: document.getElementById('bookGenre'),
    bookReview: document.getElementById('bookReview'),
    addBookBtn: document.getElementById('addBookBtn'),
    booksGrid: document.getElementById('booksGrid'),
    readCount: document.getElementById('readCount'),
    readingCount: document.getElementById('readingCount'),
    wantCount: document.getElementById('wantCount'),
    
    // Клубы
    clubName: document.getElementById('clubName'),
    clubGenre: document.getElementById('clubGenre'),
    clubDescription: document.getElementById('clubDescription'),
    createClubBtn: document.getElementById('createClubBtn'),
    clubSearch: document.getElementById('clubSearch'),
    clubsGrid: document.getElementById('clubsGrid'),
    myClubsList: document.getElementById('myClubsList'),
    
    // Друзья
    friendSearch: document.getElementById('friendSearch'),
    searchFriendBtn: document.getElementById('searchFriendBtn'),
    searchResults: document.getElementById('searchResults'),
    friendsList: document.getElementById('friendsList'),
    friendsCount: document.getElementById('friendsCount'),
    requestsList: document.getElementById('requestsList'),
    requestsCount: document.getElementById('requestsCount'),
    
    // Страницы
    pages: document.querySelectorAll('.page'),
    
    // Звезды рейтинга
    stars: document.querySelectorAll('.stars i')
};

// ==============================================
// УТИЛИТЫ
// ==============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notificationArea') || document.body;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showLoading(show = true) {
    const loader = document.getElementById('loadingScreen');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function switchPage(pageId) {
    // Скрыть все страницы
    elements.pages.forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });
    
    // Показать выбранную страницу
    const page = document.getElementById(pageId);
    if (page) {
        page.style.display = 'block';
        page.classList.add('active');
    }
    
    // Обновить навигацию
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${pageId}`) {
            link.classList.add('active');
        }
    });
}

// ==============================================
// НАСТРОЙКА СОБЫТИЙ
// ==============================================
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Навигация
    elements.homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage('home');
    });
    
    elements.shelfLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showAuthModal();
            return;
        }
        switchPage('shelf');
        loadBooks();
    });
    
    elements.clubsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showAuthModal();
            return;
        }
        switchPage('clubs');
        loadClubs();
        loadMyClubs();
    });
    
    elements.friendsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showAuthModal();
            return;
        }
        switchPage('friends');
        loadFriends();
        loadFriendRequests();
    });
    
    // Кнопки авторизации
    elements.loginBtn.addEventListener('click', showAuthModal);
    elements.registerBtn.addEventListener('click', () => showAuthModal('register'));
    elements.startBtn.addEventListener('click', showAuthModal);
    elements.welcomeLoginBtn.addEventListener('click', showAuthModal);
    elements.logoutBtn.addEventListener('click', logout);
    
    // Модальное окно
    elements.closeModal.addEventListener('click', hideAuthModal);
    
    // Вкладки модального окна
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchAuthTab(tab);
        });
    });
    
    // Форма авторизации
    elements.authForm.addEventListener('submit', handleAuth);
    
    // Закрытие модального окна по клику вне его
    window.addEventListener('click', (e) => {
        if (e.target === elements.authModal) {
            hideAuthModal();
        }
    });
    
    // Книги
    elements.addBookBtn.addEventListener('click', addBook);
    
    // Звезды рейтинга
    elements.stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.dataset.value);
            setRating(value);
        });
    });
    
    // Полки
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab')) {
            const status = e.target.dataset.status;
            filterBooks(status);
            
            // Обновить активную вкладку
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            e.target.classList.add('active');
        }
    });
    
    // Клубы
    elements.createClubBtn.addEventListener('click', createClub);
    elements.clubSearch.addEventListener('input', searchClubs);
    
    // Друзья
    elements.searchFriendBtn.addEventListener('click', searchFriends);
    
    // Кнопка меню на мобильных
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        });
    }
    
    console.log('Обработчики событий настроены');
}

// ==============================================
// АВТОРИЗАЦИЯ
// ==============================================
function showAuthModal(tab = 'login') {
    elements.authModal.style.display = 'flex';
    switchAuthTab(tab);
}

function hideAuthModal() {
    elements.authModal.style.display = 'none';
    elements.authForm.reset();
}

function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    
    // Обновить вкладки
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Обновить форму
    elements.emailField.style.display = isLogin ? 'none' : 'block';
    elements.submitText.textContent = isLogin ? 'Войти' : 'Зарегистрироваться';
}

async function handleAuth(e) {
    e.preventDefault();
    
    const username = elements.username.value.trim();
    const password = elements.password.value.trim();
    const email = elements.email.value.trim();
    const isLogin = document.querySelector('.tab-btn.active').dataset.tab === 'login';
    
    if (!username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        if (isLogin) {
            await login(username, password);
        } else {
            await register(username, password, email);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function login(username, password) {
    try {
        // Ищем пользователя в Firestore
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('username', '==', username)
            .where('password', '==', password)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            throw new Error('Неверный логин или пароль');
        }
        
        let userData = null;
        let userId = null;
        
        snapshot.forEach(doc => {
            userData = doc.data();
            userId = doc.id;
        });
        
        // Сохраняем пользователя
        currentUser = { id: userId, ...userData };
        
        // Обновляем интерфейс
        updateUI();
        hideAuthModal();
        switchPage('shelf');
        loadBooks();
        
        showNotification(`Добро пожаловать, ${username}!`, 'success');
        
    } catch (error) {
        throw new Error('Ошибка входа: ' + error.message);
    }
}

async function register(username, password, email) {
    try {
        // Проверяем, существует ли пользователь
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
            email: email || '',
            createdAt: new Date().toISOString(),
            books: [],
            friends: [],
            clubs: [],
            friendRequests: []
        };
        
        // Добавляем в Firestore
        const docRef = await usersRef.add(userData);
        
        // Сохраняем пользователя
        currentUser = { id: docRef.id, ...userData };
        
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
    currentBooks = [];
    currentClubs = [];
    currentFriends = [];
    currentRequests = [];
    
    // Обновляем интерфейс
    elements.authButtons.style.display = 'flex';
    elements.userMenu.style.display = 'none';
    
    switchPage('home');
    
    showNotification('Вы вышли из системы', 'info');
}

function updateUI() {
    if (currentUser) {
        elements.authButtons.style.display = 'none';
        elements.userMenu.style.display = 'flex';
        elements.userName.textContent = currentUser.username;
        if (elements.currentUser) {
            elements.currentUser.textContent = currentUser.username;
        }
    }
}

// ==============================================
// КНИГИ
// ==============================================
function setRating(rating) {
    currentRating = rating;
    
    // Обновляем звезды
    elements.stars.forEach((star, index) => {
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
    
    const title = elements.bookTitle.value.trim();
    const author = elements.bookAuthor.value.trim();
    const status = elements.bookStatus.value;
    const genre = elements.bookGenre.value;
    const review = elements.bookReview.value.trim();
    const rating = currentRating;
    
    if (!title || !author) {
        showNotification('Заполните название и автора', 'error');
        return;
    }
    
    showLoading(true);
    
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
        
        // Обновляем локальные данные
        currentBooks.push(bookData);
        
        // Очищаем форму
        elements.bookTitle.value = '';
        elements.bookAuthor.value = '';
        elements.bookReview.value = '';
        setRating(0);
        
        // Обновляем отображение
        updateBooksDisplay();
        updateBookCounts();
        
        showNotification('Книга добавлена!', 'success');
        
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadBooks() {
    if (!currentUser) return;
    
    showLoading(true);
    
    try {
        // Получаем книги пользователя
        const booksRef = db.collection('books');
        const snapshot = await booksRef
            .where('userId', '==', currentUser.id)
            .orderBy('createdAt', 'desc')
            .get();
        
        currentBooks = [];
        snapshot.forEach(doc => {
            currentBooks.push({ id: doc.id, ...doc.data() });
        });
        
        // Обновляем отображение
        updateBooksDisplay();
        updateBookCounts();
        
    } catch (error) {
        showNotification('Ошибка загрузки книг', 'error');
    } finally {
        showLoading(false);
    }
}

function updateBooksDisplay() {
    const booksGrid = elements.booksGrid;
    if (!booksGrid) return;
    
    if (currentBooks.length === 0) {
        booksGrid.innerHTML = '<p class="empty">Пока нет книг. Добавьте первую!</p>';
        return;
    }
    
    // Фильтруем по активной вкладке
    const activeTab = document.querySelector('.tab.active');
    const status = activeTab ? activeTab.dataset.status : 'read';
    const filteredBooks = currentBooks.filter(book => book.status === status);
    
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

function filterBooks(status) {
    updateBooksDisplay();
}

function updateBookCounts() {
    if (!currentUser) return;
    
    const total = currentBooks.length;
    const read = currentBooks.filter(b => b.status === 'read').length;
    const reading = currentBooks.filter(b => b.status === 'reading').length;
    const want = currentBooks.filter(b => b.status === 'want').length;
    
    if (elements.bookCount) elements.bookCount.textContent = `${total} книг`;
    if (elements.readCount) elements.readCount.textContent = read;
    if (elements.readingCount) elements.readingCount.textContent = reading;
    if (elements.wantCount) elements.wantCount.textContent = want;
}

// ==============================================
// КЛУБЫ
// ==============================================
async function createClub() {
    if (!currentUser) {
        showNotification('Войдите в систему', 'error');
        return;
    }
    
    const name = elements.clubName.value.trim();
    const genre = elements.clubGenre.value;
    const description = elements.clubDescription.value.trim();
    
    if (!name || !description) {
        showNotification('Заполните название и описание', 'error');
        return;
    }
    
    showLoading(true);
    
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
        clubData.id = docRef.id;
        
        // Добавляем клуб пользователю
        await db.collection('users').doc(currentUser.id).update({
            clubs: firebase.firestore.FieldValue.arrayUnion(docRef.id)
        });
        
        // Очищаем форму
        elements.clubName.value = '';
        elements.clubDescription.value = '';
        
        // Обновляем отображение
        await loadClubs();
        await loadMyClubs();
        
        showNotification('Клуб создан!', 'success');
        
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadClubs() {
    showLoading(true);
    
    try {
        const clubsRef = db.collection('clubs');
        const snapshot = await clubsRef.orderBy('createdAt', 'desc').get();
        
        currentClubs = [];
        snapshot.forEach(doc => {
            currentClubs.push({ id: doc.id, ...doc.data() });
        });
        
        updateClubsDisplay(currentClubs);
        
    } catch (error) {
        showNotification('Ошибка загрузки клубов', 'error');
    } finally {
        showLoading(false);
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
    const clubsGrid = elements.clubsGrid;
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
    const myClubsList = elements.myClubsList;
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

function searchClubs() {
    const searchTerm = elements.clubSearch.value.toLowerCase();
    
    if (!searchTerm) {
        updateClubsDisplay(currentClubs);
        return;
    }
    
    const filtered = currentClubs.filter(club => 
        club.name.toLowerCase().includes(searchTerm) ||
        club.description.toLowerCase().includes(searchTerm) ||
        club.genre.toLowerCase().includes(searchTerm)
    );
    
    updateClubsDisplay(filtered);
}

async function joinClub(clubId) {
    if (!currentUser) {
        showNotification('Войдите в систему', 'error');
        return;
    }
    
    showLoading(true);
    
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
    } finally {
        showLoading(false);
    }
}

// ==============================================
// ДРУЗЬЯ
// ==============================================
async function searchFriends() {
    const username = elements.friendSearch.value.trim();
    
    if (!username) {
        showNotification('Введите никнейм', 'error');
        return;
    }
    
    showLoading(true);
    
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
    } finally {
        showLoading(false);
    }
}

function displaySearchResults(users) {
    const searchResults = elements.searchResults;
    if (!searchResults) return;
    
    if (users.length === 0) {
        searchResults.innerHTML = '<p class="empty">Пользователи не найдены</p>';
        return;
    }
    
    searchResults.innerHTML = users.map(user => {
        const isFriend = currentFriends.some(f => f.id === user.id);
        const hasRequest = currentRequests.some(r => r.senderId === user.id || r.receiverId === user.id);
        
        return `
            <div class="friend-item">
                <div class="friend-info">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div>
                        <h4>${user.username}</h4>
                        ${user.email ? `<p>${user.email}</p>` : ''}
                    </div>
                </div>
                <div class="friend-actions">
                    ${isFriend ? 
                        '<span class="badge">Друг</span>' : 
                        hasRequest ?
                        '<span class="badge">Запрос отправлен</span>' :
                        `<button class="btn btn-primary btn-small send-request" data-user-id="${user.id}">
                            Добавить
                        </button>`
                    }
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
    
    showLoading(true);
    
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
    } finally {
        showLoading(false);
    }
}

async function loadFriends() {
    if (!currentUser) return;
    
    showLoading(true);
    
    try {
        // Получаем друзей пользователя
        const userDoc = await db.collection('users').doc(currentUser.id).get();
        const userData = userDoc.data();
        const friendIds = userData?.friends || [];
        
        // Загружаем данные друзей
        currentFriends = [];
        for (const friendId of friendIds) {
            const friendDoc = await db.collection('users').doc(friendId).get();
            if (friendDoc.exists) {
                currentFriends.push({ id: friendDoc.id, ...friendDoc.data() });
            }
        }
        
        updateFriendsDisplay();
        
    } catch (error) {
        showNotification('Ошибка загрузки друзей', 'error');
    } finally {
        showLoading(false);
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
        
        currentRequests = [];
        snapshot.forEach(doc => {
            currentRequests.push({ id: doc.id, ...doc.data() });
        });
        
        updateRequestsDisplay();
        
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
    }
}

function updateFriendsDisplay() {
    const friendsList = elements.friendsList;
    const friendsCount = elements.friendsCount;
    
    if (!friendsList) return;
    
    if (currentFriends.length === 0) {
        friendsList.innerHTML = '<p class="empty">Пока нет друзей</p>';
        if (friendsCount) friendsCount.textContent = '0';
        return;
    }
    
    friendsList.innerHTML = currentFriends.map(friend => `
        <div class="friend-item">
            <div class="friend-info">
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div>
                    <h4>${friend.username}</h4>
                    ${friend.email ? `<p>${friend.email}</p>` : ''}
                </div>
            </div>
            <div class="friend-actions">
                <button class="btn btn-outline btn-small remove-friend" data-user-id="${friend.id}">
                    Удалить
                </button>
            </div>
        </div>
    `).join('');
    
    if (friendsCount) friendsCount.textContent = currentFriends.length;
    
    // Добавляем обработчики для кнопок удаления
    document.querySelectorAll('.remove-friend').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            await removeFriend(userId);
        });
    });
}

function updateRequestsDisplay() {
    const requestsList = elements.requestsList;
    const requestsCount = elements.requestsCount;
    
    if (!requestsList) return;
    
    if (currentRequests.length === 0) {
        requestsList.innerHTML = '<p class="empty">Нет заявок в друзья</p>';
        if (requestsCount) requestsCount.textContent = '0';
        return;
    }
    
    requestsList.innerHTML = currentRequests.map(request => `
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
    
    if (requestsCount) requestsCount.textContent = currentRequests.length;
    
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
    showLoading(true);
    
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
    } finally {
        showLoading(false);
    }
}

async function removeFriend(friendId) {
    if (!confirm('Удалить из друзей?')) return;
    
    showLoading(true);
    
    try {
        // Удаляем друг у друга из друзей
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
            await db.collection('friends').doc(doc.id).delete();
        });
        
        showNotification('Друг удален', 'info');
        
        // Обновляем данные
        await loadFriends();
        
    } catch (error) {
        showNotification('Ошибка удаления друга', 'error');
    } finally {
        showLoading(false);
    }
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ
// ==============================================
async function init() {
    console.log('Инициализация приложения...');
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Проверяем авторизацию
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUI();
            switchPage('shelf');
            await loadBooks();
            showNotification('Автоматический вход выполнен', 'info');
        } catch (error) {
            localStorage.removeItem('currentUser');
        }
    }
    
    // Инициализируем демо-данные если нужно
    await initDemoData();
    
    console.log('Приложение готово!');
}

// ==============================================
// ДЕМО-ДАННЫЕ
// ==============================================
async function initDemoData() {
    try {
        // Проверяем, есть ли демо-пользователь
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('username', '==', 'test').limit(1).get();
        
        if (snapshot.empty) {
            // Создаем демо-пользователя
            const demoUser = {
                username: 'test',
                password: 'test123',
                email: 'demo@example.com',
                createdAt: new Date().toISOString(),
                books: [],
                friends: [],
                clubs: [],
                friendRequests: []
            };
            
            await usersRef.add(demoUser);
            console.log('Демо-пользователь создан');
        }
        
        // Проверяем, есть ли демо-клубы
        const clubsRef = db.collection('clubs');
        const clubsSnapshot = await clubsRef.limit(1).get();
        
        if (clubsSnapshot.empty) {
            // Создаем демо-клубы
            const demoClubs = [
                {
                    name: 'Фэнтези-мир',
                    genre: 'fantasy',
                    description: 'Клуб для любителей фэнтези литературы',
                    ownerId: 'demo',
                    ownerName: 'Администратор',
                    members: ['demo'],
                    membersCount: 1,
                    createdAt: new Date().toISOString()
                },
                {
                    name: 'Классика навсегда',
                    genre: 'classic',
                    description: 'Обсуждаем классическую литературу',
                    ownerId: 'demo',
                    ownerName: 'Администратор',
                    members: ['demo'],
                    membersCount: 1,
                    createdAt: new Date().toISOString()
                }
            ];
            
            for (const club of demoClubs) {
                await clubsRef.add(club);
            }
            
            console.log('Демо-клубы созданы');
        }
        
    } catch (error) {
        console.error('Ошибка инициализации демо-данных:', error);
    }
}

// ==============================================
// ЗАПУСК
// ==============================================
document.addEventListener('DOMContentLoaded', init);
