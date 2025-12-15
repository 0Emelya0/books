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
const state = {
    currentUser: null,
    currentShelf: 'read',
    currentRating: 0,
    isLoggedIn: false,
    users: {},
    books: [],
    clubs: [],
    friends: [],
    friendRequests: []
};

// ==============================================
// DOM ЭЛЕМЕНТЫ
// ==============================================
const elements = {
    // Общие
    loadingScreen: document.getElementById('loadingScreen'),
    backgroundOverlay: document.getElementById('backgroundOverlay'),
    
    // Страницы
    homePage: document.getElementById('homePage'),
    shelfPage: document.getElementById('shelfPage'),
    clubsPage: document.getElementById('clubsPage'),
    friendsPage: document.getElementById('friendsPage'),
    
    // Навигация
    navLinks: document.getElementById('navLinks'),
    menuToggle: document.getElementById('menuToggle'),
    homeLink: document.getElementById('homeLink'),
    shelfLink: document.getElementById('shelfLink'),
    clubsLink: document.getElementById('clubsLink'),
    friendsLink: document.getElementById('friendsLink'),
    
    // Авторизация
    authButtons: document.getElementById('authButtons'),
    userMenu: document.getElementById('userMenu'),
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    welcomeLoginBtn: document.getElementById('welcomeLoginBtn'),
    
    // Модальные окна
    authModal: document.getElementById('authModal'),
    closeModal: document.getElementById('closeModal'),
    clubModal: document.getElementById('clubModal'),
    closeClubModal: document.getElementById('closeClubModal'),
    clubModalContent: document.getElementById('clubModalContent'),
    
    // Форма авторизации
    loginTab: document.getElementById('loginTab'),
    registerTab: document.getElementById('registerTab'),
    modalTitle: document.getElementById('modalTitle'),
    authForm: document.getElementById('authForm'),
    username: document.getElementById('username'),
    authPassword: document.getElementById('authPassword'),
    userEmail: document.getElementById('userEmail'),
    userBio: document.getElementById('userBio'),
    registerFields: document.getElementById('registerFields'),
    authSubmitBtn: document.getElementById('authSubmitBtn'),
    submitText: document.getElementById('submitText'),
    
    // Моя полка
    shelfUserName: document.getElementById('shelfUserName'),
    booksCount: document.getElementById('booksCount'),
    bookTitle: document.getElementById('bookTitle'),
    bookAuthor: document.getElementById('bookAuthor'),
    bookStatus: document.getElementById('bookStatus'),
    bookGenre: document.getElementById('bookGenre'),
    bookReview: document.getElementById('bookReview'),
    ratingStars: document.querySelectorAll('.star'),
    ratingValue: document.getElementById('ratingValue'),
    addBookBtn: document.getElementById('addBookBtn'),
    booksGrid: document.getElementById('booksGrid'),
    shelfTabs: document.querySelectorAll('.shelf-tab'),
    readCount: document.getElementById('readCount'),
    readingCount: document.getElementById('readingCount'),
    wantCount: document.getElementById('wantCount'),
    
    // Клубы
    clubSearch: document.getElementById('clubSearch'),
    clubName: document.getElementById('clubName'),
    clubGenre: document.getElementById('clubGenre'),
    clubDescription: document.getElementById('clubDescription'),
    createClubBtn: document.getElementById('createClubBtn'),
    genreFilters: document.getElementById('genreFilters'),
    clubsGrid: document.getElementById('clubsGrid'),
    myClubsList: document.getElementById('myClubsList'),
    
    // Друзья
    friendSearch: document.getElementById('friendSearch'),
    searchFriendBtn: document.getElementById('searchFriendBtn'),
    friendSearchResults: document.getElementById('friendSearchResults'),
    friendsList: document.getElementById('friendsList'),
    friendsCount: document.getElementById('friendsCount'),
    friendRequestsList: document.getElementById('friendRequestsList'),
    requestsCount: document.getElementById('requestsCount'),
    friendRecommendations: document.getElementById('friendRecommendations')
};

// ==============================================
// УТИЛИТЫ
// ==============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        padding: 1.25rem 2rem;
        border-radius: 15px;
        color: white;
        font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
        z-index: 3000;
        max-width: 350px;
        display: flex;
        align-items: center;
        gap: 1rem;
        border-left: 6px solid;
        background: ${type === 'success' ? 'linear-gradient(135deg, #4CAF50, #66BB6A)' : 
                     type === 'error' ? 'linear-gradient(135deg, #F44336, #EF5350)' : 
                     type === 'warning' ? 'linear-gradient(135deg, #FF9800, #FFB74D)' : 
                     'linear-gradient(135deg, #8B4513, #A0522D)'};
        border-left-color: ${type === 'success' ? '#2E7D32' : 
                          type === 'error' ? '#C62828' : 
                          type === 'warning' ? '#EF6C00' : '#654321'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showLoading(show = true) {
    if (show) {
        elements.loadingScreen.style.display = 'flex';
    } else {
        elements.loadingScreen.style.display = 'none';
    }
}

function updateBackground(page) {
    document.body.className = `${page}-page`;
}

// ==============================================
// НАВИГАЦИЯ
// ==============================================
function navigateTo(page) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    
    // Показываем выбранную страницу
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
        pageElement.style.display = 'block';
    }
    
    // Обновляем фон
    updateBackground(page);
    
    // Обновляем активную ссылку в навигации
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Загружаем данные для страницы
    switch(page) {
        case 'home':
            break;
        case 'shelf':
            loadUserBooks();
            break;
        case 'clubs':
            loadClubs();
            loadMyClubs();
            break;
        case 'friends':
            loadFriends();
            loadFriendRequests();
            loadFriendRecommendations();
            break;
    }
}

// ==============================================
// АВТОРИЗАЦИЯ
// ==============================================
function showAuthModal(type = 'login') {
    elements.authModal.style.display = 'block';
    switchAuthTab(type);
}

function hideAuthModal() {
    elements.authModal.style.display = 'none';
    elements.authForm.reset();
    state.currentRating = 0;
    updateRatingStars();
}

function switchAuthTab(type) {
    const isLogin = type === 'login';
    
    elements.loginTab.classList.toggle('active', isLogin);
    elements.registerTab.classList.toggle('active', !isLogin);
    elements.modalTitle.textContent = isLogin ? 'Вход в BookShelf' : 'Регистрация';
    elements.submitText.textContent = isLogin ? 'Войти' : 'Зарегистрироваться';
    elements.registerFields.style.display = isLogin ? 'none' : 'block';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const isLogin = elements.loginTab.classList.contains('active');
    const username = elements.username.value.trim();
    const password = elements.authPassword.value.trim();
    const email = elements.userEmail.value.trim();
    const bio = elements.userBio.value.trim();
    
    // Валидация
    if (!username || !password) {
        showNotification('Заполните все обязательные поля', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('Никнейм должен быть не менее 3 символов', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        if (isLogin) {
            await loginUser(username, password);
        } else {
            await registerUser(username, password, email, bio);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loginUser(username, password) {
    try {
        // Ищем пользователя в Firestore
        const usersSnapshot = await db.collection('users')
            .where('username', '==', username)
            .where('password', '==', password)
            .limit(1)
            .get();
        
        if (usersSnapshot.empty) {
            throw new Error('Неверный никнейм или пароль');
        }
        
        let userData = null;
        let userId = null;
        
        usersSnapshot.forEach(doc => {
            userData = doc.data();
            userId = doc.id;
        });
        
        // Сохраняем пользователя в состоянии
        state.currentUser = { id: userId, ...userData };
        state.isLoggedIn = true;
        
        // Сохраняем в localStorage
        localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
        
        hideAuthModal();
        showMainContent();
        navigateTo('shelf');
        showNotification(`Добро пожаловать, ${username}!`, 'success');
        
    } catch (error) {
        throw new Error('Ошибка входа: ' + error.message);
    }
}

async function registerUser(username, password, email, bio) {
    try {
        // Проверяем, существует ли пользователь
        const existingUser = await db.collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();
        
        if (!existingUser.empty) {
            throw new Error('Пользователь с таким никнеймом уже существует');
        }
        
        // Создаем нового пользователя
        const userData = {
            username: username,
            password: password,
            email: email || '',
            bio: bio || '',
            createdAt: new Date().toISOString(),
            books: [],
            friends: [],
            clubs: [],
            friendRequests: []
        };
        
        // Добавляем пользователя в Firestore
        const userRef = await db.collection('users').add(userData);
        
        // Сохраняем в состоянии
        state.currentUser = { id: userRef.id, ...userData };
        state.isLoggedIn = true;
        
        // Сохраняем в localStorage
        localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
        
        hideAuthModal();
        showMainContent();
        navigateTo('shelf');
        showNotification('Регистрация прошла успешно! Добро пожаловать!', 'success');
        
    } catch (error) {
        throw new Error('Ошибка регистрации: ' + error.message);
    }
}

function logout() {
    state.currentUser = null;
    state.isLoggedIn = false;
    localStorage.removeItem('currentUser');
    showWelcomeScreen();
    showNotification('Вы успешно вышли из системы', 'info');
}

function showWelcomeScreen() {
    elements.authButtons.style.display = 'flex';
    elements.userMenu.style.display = 'none';
    navigateTo('home');
}

function showMainContent() {
    elements.authButtons.style.display = 'none';
    elements.userMenu.style.display = 'flex';
    elements.userName.textContent = state.currentUser.username;
}

// ==============================================
// КНИГИ И ПОЛКА
// ==============================================
function setupRatingStars() {
    elements.ratingStars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.dataset.rating);
            highlightStars(rating);
        });
        
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            state.currentRating = rating;
            updateRatingStars();
        });
    });
    
    // Сброс рейтинга при уходе мыши
    const starsContainer = document.querySelector('.stars');
    starsContainer.addEventListener('mouseleave', () => {
        updateRatingStars();
    });
}

function highlightStars(rating) {
    elements.ratingStars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        if (starRating <= rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

function updateRatingStars() {
    elements.ratingStars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        if (starRating <= state.currentRating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
    elements.ratingValue.textContent = `${state.currentRating}/5`;
}

async function addBook() {
    if (!state.currentUser) {
        showNotification('Пожалуйста, войдите в систему', 'error');
        return;
    }
    
    const title = elements.bookTitle.value.trim();
    const author = elements.bookAuthor.value.trim();
    const status = elements.bookStatus.value;
    const genre = elements.bookGenre.value;
    const review = elements.bookReview.value.trim();
    const rating = state.currentRating;
    
    if (!title || !author) {
        showNotification('Заполните название и автора', 'error');
        return;
    }
    
    if (!genre) {
        showNotification('Выберите жанр', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Создаем ID для книги
        const bookId = Date.now().toString();
        
        const bookData = {
            id: bookId,
            title: title,
            author: author,
            status: status,
            genre: genre,
            review: review || '',
            rating: rating,
            userId: state.currentUser.id,
            username: state.currentUser.username,
            addedAt: new Date().toISOString()
        };
        
        // Сохраняем книгу в Firestore
        await db.collection('books').doc(bookId).set(bookData);
        
        // Добавляем ID книги к пользователю
        const userRef = db.collection('users').doc(state.currentUser.id);
        await userRef.update({
            books: firebase.firestore.FieldValue.arrayUnion(bookId)
        });
        
        // Очищаем форму
        elements.bookTitle.value = '';
        elements.bookAuthor.value = '';
        elements.bookReview.value = '';
        elements.bookGenre.value = '';
        state.currentRating = 0;
        updateRatingStars();
        
        // Обновляем отображение
        await loadUserBooks();
        showNotification('Книга успешно добавлена на полку!', 'success');
        
    } catch (error) {
        showNotification('Ошибка при добавлении книги: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadUserBooks() {
    if (!state.currentUser) return;
    
    showLoading(true);
    
    try {
        // Получаем книги пользователя
        const userRef = db.collection('users').doc(state.currentUser.id);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            showNotification('Профиль пользователя не найден', 'error');
            return;
        }
        
        const userData = userDoc.data();
        const bookIds = userData.books || [];
        
        // Получаем данные о книгах
        const books = [];
        for (const bookId of bookIds) {
            const bookDoc = await db.collection('books').doc(bookId).get();
            if (bookDoc.exists) {
                books.push(bookDoc.data());
            }
        }
        
        // Сохраняем в состоянии
        state.books = books;
        
        // Обновляем интерфейс
        updateBooksDisplay();
        updateBooksCount();
        
        // Обновляем имя пользователя
        elements.shelfUserName.textContent = state.currentUser.username;
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        showNotification('Ошибка загрузки книг', 'error');
    } finally {
        showLoading(false);
    }
}

function updateBooksDisplay() {
    const filteredBooks = state.books.filter(book => book.status === state.currentShelf);
    const booksGrid = elements.booksGrid;
    
    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open empty-icon"></i>
                <p>На этой полке пока нет книг</p>
                <p class="empty-hint">Добавьте свою первую книгу!</p>
            </div>
        `;
        return;
    }
    
    booksGrid.innerHTML = '';
    
    filteredBooks.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
}

function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    // Создаем звезды для рейтинга
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= book.rating) {
            starsHtml += '<i class="fas fa-star"></i>';
        } else {
            starsHtml += '<i class="far fa-star"></i>';
        }
    }
    
    // Определяем статус
    let statusText = '';
    let statusClass = '';
    switch(book.status) {
        case 'read':
            statusText = 'Прочитано';
            statusClass = 'status-read';
            break;
        case 'reading':
            statusText = 'Читаю сейчас';
            statusClass = 'status-reading';
            break;
        case 'want':
            statusText = 'Хочу прочитать';
            statusClass = 'status-want';
            break;
    }
    
    const date = new Date(book.addedAt);
    const formattedDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    card.innerHTML = `
        <div class="book-header">
            <div>
                <h4 class="book-title">${book.title}</h4>
                <p class="book-author">${book.author}</p>
            </div>
            <span class="book-status ${statusClass}">${statusText}</span>
        </div>
        
        ${book.review ? `
            <div class="book-review">
                <p>"${book.review}"</p>
            </div>
        ` : ''}
        
        <div class="book-footer">
            <div class="book-rating">
                ${starsHtml}
                <span style="margin-left: 10px; color: #8B4513; font-weight: bold;">${book.genre}</span>
            </div>
            <div class="book-date">
                Добавлено: ${formattedDate}
            </div>
        </div>
    `;
    
    return card;
}

function updateBooksCount() {
    const total = state.books.length;
    const read = state.books.filter(b => b.status === 'read').length;
    const reading = state.books.filter(b => b.status === 'reading').length;
    const want = state.books.filter(b => b.status === 'want').length;
    
    elements.booksCount.textContent = `${total} книг`;
    elements.readCount.textContent = read;
    elements.readingCount.textContent = reading;
    elements.wantCount.textContent = want;
}

function switchShelf(shelf) {
    state.currentShelf = shelf;
    
    // Обновляем активные вкладки
    elements.shelfTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.shelf === shelf);
    });
    
    // Обновляем отображение книг
    updateBooksDisplay();
}

// ==============================================
// КЛУБЫ
// ==============================================
async function createClub() {
    if (!state.currentUser) {
        showNotification('Пожалуйста, войдите в систему', 'error');
        return;
    }
    
    const name = elements.clubName.value.trim();
    const genre = elements.clubGenre.value;
    const description = elements.clubDescription.value.trim();
    
    if (!name || !genre || !description) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (name.length < 3) {
        showNotification('Название клуба должно быть не менее 3 символов', 'error');
        return;
    }
    
    if (description.length < 10) {
        showNotification('Описание должно быть не менее 10 символов', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Создаем ID для клуба
        const clubId = Date.now().toString();
        
        const clubData = {
            id: clubId,
            name: name,
            genre: genre,
            description: description,
            ownerId: state.currentUser.id,
            ownerName: state.currentUser.username,
            members: [state.currentUser.id],
            membersCount: 1,
            createdAt: new Date().toISOString(),
            discussions: []
        };
        
        // Сохраняем клуб в Firestore
        await db.collection('clubs').doc(clubId).set(clubData);
        
        // Добавляем клуб к пользователю
        const userRef = db.collection('users').doc(state.currentUser.id);
        await userRef.update({
            clubs: firebase.firestore.FieldValue.arrayUnion(clubId)
        });
        
        // Очищаем форму
        elements.clubName.value = '';
        elements.clubDescription.value = '';
        elements.clubGenre.value = '';
        
        // Обновляем отображение
        await loadClubs();
        await loadMyClubs();
        showNotification('Клуб успешно создан!', 'success');
        
    } catch (error) {
        showNotification('Ошибка при создании клуба: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadClubs() {
    showLoading(true);
    
    try {
        // Загружаем все клубы
        const clubsSnapshot = await db.collection('clubs').get();
        const clubs = [];
        
        clubsSnapshot.forEach(doc => {
            clubs.push(doc.data());
        });
        
        // Сохраняем в состоянии
        state.clubs = clubs;
        
        // Обновляем интерфейс
        updateClubsDisplay(clubs);
        setupGenreFilters();
        
    } catch (error) {
        console.error('Ошибка загрузки клубов:', error);
        showNotification('Ошибка загрузки клубов', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadMyClubs() {
    if (!state.currentUser) return;
    
    try {
        // Получаем клубы пользователя
        const userRef = db.collection('users').doc(state.currentUser.id);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) return;
        
        const userData = userDoc.data();
        const clubIds = userData.clubs || [];
        
        // Получаем данные о клубах
        const myClubs = [];
        for (const clubId of clubIds) {
            const clubDoc = await db.collection('clubs').doc(clubId).get();
            if (clubDoc.exists) {
                myClubs.push(clubDoc.data());
            }
        }
        
        // Обновляем интерфейс
        updateMyClubsDisplay(myClubs);
        
    } catch (error) {
        console.error('Ошибка загрузки моих клубов:', error);
    }
}

function updateClubsDisplay(clubs) {
    const clubsGrid = elements.clubsGrid;
    
    if (clubs.length === 0) {
        clubsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users empty-icon"></i>
                <p>Пока нет созданных клубов</p>
                <p class="empty-hint">Создайте первый клуб!</p>
            </div>
        `;
        return;
    }
    
    clubsGrid.innerHTML = '';
    
    clubs.forEach(club => {
        const clubCard = createClubCard(club);
        clubsGrid.appendChild(clubCard);
    });
}

function createClubCard(club) {
    const card = document.createElement('div');
    card.className = 'club-card';
    
    // Проверяем, состоит ли пользователь в клубе
    const isMember = club.members && club.members.includes(state.currentUser?.id);
    
    card.innerHTML = `
        <div class="club-header">
            <div>
                <h4 class="club-name">${club.name}</h4>
                <p class="club-owner">Создатель: ${club.ownerName}</p>
            </div>
            <span class="club-genre">${getGenreName(club.genre)}</span>
        </div>
        
        <p class="club-description">${club.description}</p>
        
        <div class="club-stats">
            <div class="club-members">
                <i class="fas fa-users"></i>
                <span>${club.membersCount} участников</span>
            </div>
            <button class="btn ${isMember ? 'btn-outline' : 'btn-primary'} btn-small join-club-btn" 
                    data-club-id="${club.id}">
                ${isMember ? '<i class="fas fa-check"></i> Вы в клубе' : '<i class="fas fa-plus"></i> Присоединиться'}
            </button>
        </div>
    `;
    
    // Добавляем обработчик для кнопки присоединения
    const joinBtn = card.querySelector('.join-club-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => joinClub(club.id, isMember));
    }
    
    return card;
}

function updateMyClubsDisplay(clubs) {
    const myClubsList = elements.myClubsList;
    
    if (clubs.length === 0) {
        myClubsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users empty-icon"></i>
                <p>Вы пока не состоите в клубах</p>
                <p class="empty-hint">Присоединитесь к клубу или создайте свой!</p>
            </div>
        `;
        return;
    }
    
    myClubsList.innerHTML = '';
    
    clubs.forEach(club => {
        const clubItem = document.createElement('div');
        clubItem.className = 'club-card';
        
        clubItem.innerHTML = `
            <div class="club-header">
                <div>
                    <h4 class="club-name">${club.name}</h4>
                    <p class="club-owner">Создатель: ${club.ownerName}</p>
                </div>
                <span class="club-genre">${getGenreName(club.genre)}</span>
            </div>
            
            <p class="club-description">${club.description}</p>
            
            <div class="club-stats">
                <div class="club-members">
                    <i class="fas fa-users"></i>
                    <span>${club.membersCount} участников</span>
                </div>
                <button class="btn btn-primary btn-small open-club-btn" data-club-id="${club.id}">
                    <i class="fas fa-door-open"></i> Открыть
                </button>
            </div>
        `;
        
        // Добавляем обработчик для кнопки открытия клуба
        const openBtn = clubItem.querySelector('.open-club-btn');
        if (openBtn) {
            openBtn.addEventListener('click', () => openClubModal(club.id));
        }
        
        myClubsList.appendChild(clubItem);
    });
}

function setupGenreFilters() {
    const genres = [
        { id: 'all', name: 'Все жанры' },
        { id: 'fantasy', name: 'Фэнтези' },
        { id: 'scifi', name: 'Научная фантастика' },
        { id: 'classic', name: 'Классика' },
        { id: 'detective', name: 'Детективы' },
        { id: 'romance', name: 'Романы' },
        { id: 'biography', name: 'Биографии' },
        { id: 'poetry', name: 'Поэзия' },
        { id: 'horror', name: 'Ужасы' },
        { id: 'adventure', name: 'Приключения' },
        { id: 'history', name: 'Исторические' },
        { id: 'psychology', name: 'Психология' },
        { id: 'philosophy', name: 'Философия' }
    ];
    
    const genreFilters = elements.genreFilters;
    genreFilters.innerHTML = '';
    
    genres.forEach(genre => {
        const filter = document.createElement('button');
        filter.className = 'genre-filter';
        if (genre.id === 'all') filter.classList.add('active');
        filter.textContent = genre.name;
        filter.dataset.genre = genre.id;
        
        filter.addEventListener('click', () => {
            // Убираем активный класс у всех фильтров
            document.querySelectorAll('.genre-filter').forEach(f => f.classList.remove('active'));
            // Добавляем активный класс текущему фильтру
            filter.classList.add('active');
            
            // Фильтруем клубы
            if (genre.id === 'all') {
                updateClubsDisplay(state.clubs);
            } else {
                const filteredClubs = state.clubs.filter(club => club.genre === genre.id);
                updateClubsDisplay(filteredClubs);
            }
        });
        
        genreFilters.appendChild(filter);
    });
}

function getGenreName(genreId) {
    const genres = {
        'fantasy': 'Фэнтези',
        'scifi': 'Научная фантастика',
        'classic': 'Классическая литература',
        'detective': 'Детективы',
        'romance': 'Романы',
        'biography': 'Биографии',
        'poetry': 'Поэзия',
        'horror': 'Ужасы',
        'adventure': 'Приключения',
        'history': 'Исторические',
        'psychology': 'Психология',
        'philosophy': 'Философия'
    };
    
    return genres[genreId] || genreId;
}

async function joinClub(clubId, isMember) {
    if (!state.currentUser) {
        showNotification('Пожалуйста, войдите в систему', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const clubRef = db.collection('clubs').doc(clubId);
        const clubDoc = await clubRef.get();
        
        if (!clubDoc.exists) {
            throw new Error('Клуб не найден');
        }
        
        const clubData = clubDoc.data();
        
        if (isMember) {
            // Выход из клуба
            await clubRef.update({
                members: firebase.firestore.FieldValue.arrayRemove(state.currentUser.id),
                membersCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            // Удаляем клуб у пользователя
            const userRef = db.collection('users').doc(state.currentUser.id);
            await userRef.update({
                clubs: firebase.firestore.FieldValue.arrayRemove(clubId)
            });
            
            showNotification('Вы вышли из клуба', 'info');
            
        } else {
            // Вступление в клуб
            await clubRef.update({
                members: firebase.firestore.FieldValue.arrayUnion(state.currentUser.id),
                membersCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // Добавляем клуб пользователю
            const userRef = db.collection('users').doc(state.currentUser.id);
            await userRef.update({
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

async function openClubModal(clubId) {
    showLoading(true);
    
    try {
        const clubDoc = await db.collection('clubs').doc(clubId).get();
        
        if (!clubDoc.exists) {
            throw new Error('Клуб не найден');
        }
        
        const clubData = clubDoc.data();
        
        // Загружаем участников клуба
        const members = [];
        if (clubData.members && clubData.members.length > 0) {
            for (const memberId of clubData.members) {
                const memberDoc = await db.collection('users').doc(memberId).get();
                if (memberDoc.exists) {
                    members.push(memberDoc.data());
                }
            }
        }
        
        // Создаем содержимое модального окна
        elements.clubModalContent.innerHTML = `
            <div class="club-modal-header">
                <h2>${clubData.name}</h2>
                <p class="club-modal-subtitle">${getGenreName(clubData.genre)} • ${clubData.membersCount} участников</p>
            </div>
            
            <div class="club-modal-body">
                <div class="club-modal-section">
                    <h3><i class="fas fa-info-circle"></i> Описание</h3>
                    <p>${clubData.description}</p>
                </div>
                
                <div class="club-modal-section">
                    <h3><i class="fas fa-crown"></i> Создатель</h3>
                    <div class="club-owner-info">
                        <div class="owner-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="owner-details">
                            <h4>${clubData.ownerName}</h4>
                            <p>Основатель клуба</p>
                        </div>
                    </div>
                </div>
                
                <div class="club-modal-section">
                    <h3><i class="fas fa-users"></i> Участники (${members.length})</h3>
                    <div class="club-members-list">
                        ${members.slice(0, 10).map(member => `
                            <div class="club-member">
                                <div class="member-avatar">
                                    <i class="fas fa-user-circle"></i>
                                </div>
                                <div class="member-details">
                                    <h4>${member.username}</h4>
                                    ${member.bio ? `<p>${member.bio}</p>` : ''}
                                </div>
                            </div>
                        `).join('')}
                        ${members.length > 10 ? `<p class="more-members">... и еще ${members.length - 10} участников</p>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="club-modal-footer">
                <button class="btn btn-primary btn-block close-club-modal-btn">
                    <i class="fas fa-times"></i> Закрыть
                </button>
            </div>
        `;
        
        // Показываем модальное окно
        elements.clubModal.style.display = 'block';
        
        // Добавляем обработчик для кнопки закрытия
        const closeBtn = document.querySelector('.close-club-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                elements.clubModal.style.display = 'none';
            });
        }
        
    } catch (error) {
        showNotification('Ошибка загрузки клуба: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==============================================
// ДРУЗЬЯ
// ==============================================
async function searchFriends() {
    const searchTerm = elements.friendSearch.value.trim();
    
    if (!searchTerm) {
        showNotification('Введите никнейм для поиска', 'warning');
        return;
    }
    
    if (searchTerm.length < 3) {
        showNotification('Введите не менее 3 символов', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        // Ищем пользователей по никнейму
        const usersSnapshot = await db.collection('users')
            .where('username', '>=', searchTerm)
            .where('username', '<=', searchTerm + '\uf8ff')
            .limit(10)
            .get();
        
        const results = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            // Исключаем текущего пользователя
            if (doc.id !== state.currentUser.id) {
                results.push({
                    id: doc.id,
                    ...userData
                });
            }
        });
        
        // Отображаем результаты
        displaySearchResults(results);
        
    } catch (error) {
        console.error('Ошибка поиска:', error);
        showNotification('Ошибка поиска', 'error');
    } finally {
        showLoading(false);
    }
}

function displaySearchResults(users) {
    const searchResults = elements.friendSearchResults;
    
    if (users.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search empty-icon"></i>
                <p>Пользователи не найдены</p>
            </div>
        `;
        return;
    }
    
    searchResults.innerHTML = '';
    
    users.forEach(user => {
        // Проверяем, является ли уже другом
        const isFriend = state.friends.some(f => f.id === user.id);
        const hasRequest = state.friendRequests.some(r => r.senderId === user.id || r.receiverId === user.id);
        
        const userCard = document.createElement('div');
        userCard.className = 'user-result-card';
        
        userCard.innerHTML = `
            <div class="user-result-info">
                <div class="user-result-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="user-result-details">
                    <h4>${user.username}</h4>
                    ${user.bio ? `<p>${user.bio}</p>` : '<p>Пользователь BookShelf</p>'}
                    ${user.email ? `<p><i class="fas fa-envelope"></i> ${user.email}</p>` : ''}
                </div>
            </div>
            <div class="user-result-actions">
                ${isFriend ? 
                    '<span class="friend-status"><i class="fas fa-check-circle"></i> Уже друзья</span>' : 
                    hasRequest ? 
                    '<span class="friend-status"><i class="fas fa-clock"></i> Запрос отправлен</span>' :
                    `<button class="btn btn-primary btn-small send-friend-request-btn" data-user-id="${user.id}">
                        <i class="fas fa-user-plus"></i> Добавить в друзья
                    </button>`
                }
            </div>
        `;
        
        // Добавляем обработчик для кнопки добавления в друзья
        if (!isFriend && !hasRequest) {
            const addBtn = userCard.querySelector('.send-friend-request-btn');
            if (addBtn) {
                addBtn.addEventListener('click', () => sendFriendRequest(user.id));
            }
        }
        
        searchResults.appendChild(userCard);
    });
}

async function sendFriendRequest(friendId) {
    if (!state.currentUser) return;
    
    showLoading(true);
    
    try {
        const requestId = Date.now().toString();
        
        const requestData = {
            id: requestId,
            senderId: state.currentUser.id,
            senderName: state.currentUser.username,
            receiverId: friendId,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        // Сохраняем заявку в Firestore
        await db.collection('friends').doc(requestId).set(requestData);
        
        // Добавляем заявку получателю
        const receiverRef = db.collection('users').doc(friendId);
        await receiverRef.update({
            friendRequests: firebase.firestore.FieldValue.arrayUnion(requestId)
        });
        
        showNotification('Заявка в друзья отправлена!', 'success');
        
        // Обновляем результаты поиска
        await searchFriends();
        
    } catch (error) {
        showNotification('Ошибка отправки заявки: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadFriends() {
    if (!state.currentUser) return;
    
    showLoading(true);
    
    try {
        // Загружаем друзей
        const friendsSnapshot = await db.collection('users').doc(state.currentUser.id).get();
        const userData = friendsSnapshot.data();
        
        if (!userData.friends) {
            state.friends = [];
            updateFriendsDisplay();
            updateFriendsCount();
            return;
        }
        
        // Получаем данные друзей
        const friends = [];
        for (const friendId of userData.friends) {
            const friendDoc = await db.collection('users').doc(friendId).get();
            if (friendDoc.exists) {
                friends.push({
                    id: friendId,
                    ...friendDoc.data()
                });
            }
        }
        
        state.friends = friends;
        updateFriendsDisplay();
        updateFriendsCount();
        
    } catch (error) {
        console.error('Ошибка загрузки друзей:', error);
        showNotification('Ошибка загрузки друзей', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadFriendRequests() {
    if (!state.currentUser) return;
    
    try {
        // Загружаем входящие заявки в друзья
        const userRef = db.collection('users').doc(state.currentUser.id);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) return;
        
        const userData = userDoc.data();
        const requestIds = userData.friendRequests || [];
        
        // Получаем данные заявок
        const requests = [];
        for (const requestId of requestIds) {
            const requestDoc = await db.collection('friends').doc(requestId).get();
            if (requestDoc.exists) {
                const requestData = requestDoc.data();
                if (requestData.status === 'pending' && requestData.receiverId === state.currentUser.id) {
                    // Получаем данные отправителя
                    const senderDoc = await db.collection('users').doc(requestData.senderId).get();
                    if (senderDoc.exists) {
                        requests.push({
                            id: requestId,
                            sender: {
                                id: requestData.senderId,
                                ...senderDoc.data()
                            },
                            ...requestData
                        });
                    }
                }
            }
        }
        
        state.friendRequests = requests;
        updateFriendRequestsDisplay();
        updateRequestsCount();
        
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
    }
}

async function loadFriendRecommendations() {
    if (!state.currentUser) return;
    
    try {
        // Получаем случайных пользователей для рекомендаций
        const usersSnapshot = await db.collection('users')
            .where('id', '!=', state.currentUser.id)
            .limit(5)
            .get();
        
        const recommendations = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            // Исключаем уже друзей
            if (!state.friends.some(f => f.id === doc.id)) {
                recommendations.push({
                    id: doc.id,
                    ...userData
                });
            }
        });
        
        updateFriendRecommendationsDisplay(recommendations);
        
    } catch (error) {
        console.error('Ошибка загрузки рекомендаций:', error);
    }
}

function updateFriendsDisplay() {
    const friendsList = elements.friendsList;
    
    if (state.friends.length === 0) {
        friendsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-friends empty-icon"></i>
                <p>У вас пока нет друзей</p>
                <p class="empty-hint">Найдите друзей по интересам!</p>
            </div>
        `;
        return;
    }
    
    friendsList.innerHTML = '';
    
    state.friends.forEach(friend => {
        const friendCard = document.createElement('div');
        friendCard.className = 'friend-card';
        
        // Получаем количество книг друга
        const bookCount = friend.books ? friend.books.length : 0;
        const clubCount = friend.clubs ? friend.clubs.length : 0;
        
        friendCard.innerHTML = `
            <div class="friend-info">
                <div class="friend-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="friend-details">
                    <h4>${friend.username}</h4>
                    ${friend.bio ? `<p>${friend.bio}</p>` : ''}
                    ${friend.email ? `<p><i class="fas fa-envelope"></i> ${friend.email}</p>` : ''}
                </div>
            </div>
            <div class="friend-stats">
                <span><i class="fas fa-book"></i> ${bookCount} книг</span>
                <span><i class="fas fa-users"></i> ${clubCount} клубов</span>
            </div>
            <div class="friend-actions">
                <button class="btn btn-outline btn-small remove-friend-btn" data-user-id="${friend.id}">
                    <i class="fas fa-user-minus"></i> Удалить
                </button>
            </div>
        `;
        
        // Добавляем обработчик для кнопки удаления
        const removeBtn = friendCard.querySelector('.remove-friend-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => removeFriend(friend.id));
        }
        
        friendsList.appendChild(friendCard);
    });
}

function updateFriendRequestsDisplay() {
    const requestsList = elements.friendRequestsList;
    
    if (state.friendRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell empty-icon"></i>
                <p>Нет новых заявок в друзья</p>
            </div>
        `;
        return;
    }
    
    requestsList.innerHTML = '';
    
    state.friendRequests.forEach(request => {
        const requestCard = document.createElement('div');
        requestCard.className = 'request-card';
        
        requestCard.innerHTML = `
            <div class="request-info">
                <div class="request-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="request-details">
                    <h4>${request.sender.username}</h4>
                    <p>Хочет добавить вас в друзья</p>
                    ${request.sender.bio ? `<p>${request.sender.bio}</p>` : ''}
                </div>
            </div>
            <div class="request-actions">
                <button class="btn btn-primary btn-small accept-request-btn" data-request-id="${request.id}">
                    <i class="fas fa-check"></i> Принять
                </button>
                <button class="btn btn-outline btn-small decline-request-btn" data-request-id="${request.id}">
                    <i class="fas fa-times"></i> Отклонить
                </button>
            </div>
        `;
        
        // Добавляем обработчики для кнопок
        const acceptBtn = requestCard.querySelector('.accept-request-btn');
        const declineBtn = requestCard.querySelector('.decline-request-btn');
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => handleFriendRequest(request.id, 'accept'));
        }
        
        if (declineBtn) {
            declineBtn.addEventListener('click', () => handleFriendRequest(request.id, 'decline'));
        }
        
        requestsList.appendChild(requestCard);
    });
}

function updateFriendRecommendationsDisplay(recommendations) {
    const recommendationsList = elements.friendRecommendations;
    
    if (recommendations.length === 0) {
        recommendationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-plus empty-icon"></i>
                <p>Нет рекомендаций</p>
            </div>
        `;
        return;
    }
    
    recommendationsList.innerHTML = '';
    
    recommendations.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'friend-card';
        
        const bookCount = user.books ? user.books.length : 0;
        const clubCount = user.clubs ? user.clubs.length : 0;
        
        userCard.innerHTML = `
            <div class="friend-info">
                <div class="friend-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="friend-details">
                    <h4>${user.username}</h4>
                    ${user.bio ? `<p>${user.bio}</p>` : ''}
                </div>
            </div>
            <div class="friend-stats">
                <span><i class="fas fa-book"></i> ${bookCount} книг</span>
                <span><i class="fas fa-users"></i> ${clubCount} клубов</span>
            </div>
            <div class="friend-actions">
                <button class="btn btn-primary btn-small add-friend-btn" data-user-id="${user.id}">
                    <i class="fas fa-user-plus"></i> Добавить
                </button>
            </div>
        `;
        
        // Добавляем обработчик для кнопки добавления
        const addBtn = userCard.querySelector('.add-friend-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => sendFriendRequest(user.id));
        }
        
        recommendationsList.appendChild(userCard);
    });
}

function updateFriendsCount() {
    elements.friendsCount.textContent = state.friends.length;
}

function updateRequestsCount() {
    elements.requestsCount.textContent = state.friendRequests.length;
}

async function handleFriendRequest(requestId, action) {
    showLoading(true);
    
    try {
        const requestRef = db.collection('friends').doc(requestId);
        const requestDoc = await requestRef.get();
        
        if (!requestDoc.exists) {
            throw new Error('Заявка не найдена');
        }
        
        const requestData = requestDoc.data();
        
        if (action === 'accept') {
            // Обновляем статус заявки
            await requestRef.update({ status: 'accepted' });
            
            // Добавляем друг другу в списки друзей
            const senderRef = db.collection('users').doc(requestData.senderId);
            const receiverRef = db.collection('users').doc(requestData.receiverId);
            
            await senderRef.update({
                friends: firebase.firestore.FieldValue.arrayUnion(requestData.receiverId)
            });
            
            await receiverRef.update({
                friends: firebase.firestore.FieldValue.arrayUnion(requestData.senderId)
            });
            
            // Удаляем заявку из списка получателя
            await receiverRef.update({
                friendRequests: firebase.firestore.FieldValue.arrayRemove(requestId)
            });
            
            showNotification('Заявка принята! Теперь вы друзья.', 'success');
            
        } else if (action === 'decline') {
            // Обновляем статус заявки
            await requestRef.update({ status: 'declined' });
            
            // Удаляем заявку из списка получателя
            const receiverRef = db.collection('users').doc(requestData.receiverId);
            await receiverRef.update({
                friendRequests: firebase.firestore.FieldValue.arrayRemove(requestId)
            });
            
            showNotification('Заявка отклонена', 'info');
        }
        
        // Обновляем данные
        await loadFriends();
        await loadFriendRequests();
        
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function removeFriend(friendId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя из друзей?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        // Удаляем из списков друзей
        const currentUserRef = db.collection('users').doc(state.currentUser.id);
        const friendRef = db.collection('users').doc(friendId);
        
        await currentUserRef.update({
            friends: firebase.firestore.FieldValue.arrayRemove(friendId)
        });
        
        await friendRef.update({
            friends: firebase.firestore.FieldValue.arrayRemove(state.currentUser.id)
        });
        
        // Находим и обновляем запись о дружбе в коллекции friends
        const friendsSnapshot = await db.collection('friends')
            .where('senderId', 'in', [state.currentUser.id, friendId])
            .where('receiverId', 'in', [state.currentUser.id, friendId])
            .where('status', '==', 'accepted')
            .limit(1)
            .get();
        
        friendsSnapshot.forEach(async doc => {
            await db.collection('friends').doc(doc.id).update({ status: 'removed' });
        });
        
        showNotification('Пользователь удален из друзей', 'info');
        
        // Обновляем данные
        await loadFriends();
        
    } catch (error) {
        showNotification('Ошибка удаления друга: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==============================================
// НАСТРОЙКА СОБЫТИЙ
// ==============================================
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Навигация
    elements.menuToggle.addEventListener('click', () => {
        elements.navLinks.classList.toggle('active');
    });
    
    elements.navLinks.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-link')) {
            elements.navLinks.classList.remove('active');
        }
    });
    
    // Навигационные ссылки
    elements.homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('home');
    });
    
    elements.shelfLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.isLoggedIn) {
            navigateTo('shelf');
        } else {
            showAuthModal('login');
        }
    });
    
    elements.clubsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.isLoggedIn) {
            navigateTo('clubs');
        } else {
            showAuthModal('login');
        }
    });
    
    elements.friendsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.isLoggedIn) {
            navigateTo('friends');
        } else {
            showAuthModal('login');
        }
    });
    
    // Кнопки авторизации
    elements.loginBtn.addEventListener('click', () => showAuthModal('login'));
    elements.registerBtn.addEventListener('click', () => showAuthModal('register'));
    elements.welcomeLoginBtn.addEventListener('click', () => showAuthModal('login'));
    elements.logoutBtn.addEventListener('click', logout);
    
    // Модальные окна
    elements.closeModal.addEventListener('click', hideAuthModal);
    elements.closeClubModal.addEventListener('click', () => {
        elements.clubModal.style.display = 'none';
    });
    
    // Вкладки авторизации
    elements.loginTab.addEventListener('click', () => switchAuthTab('login'));
    elements.registerTab.addEventListener('click', () => switchAuthTab('register'));
    
    // Форма авторизации
    elements.authForm.addEventListener('submit', handleAuthSubmit);
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', (e) => {
        if (e.target === elements.authModal) hideAuthModal();
        if (e.target === elements.clubModal) elements.clubModal.style.display = 'none';
    });
    
    // Книги
    elements.addBookBtn.addEventListener('click', addBook);
    
    // Полки
    elements.shelfTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchShelf(tab.dataset.shelf);
        });
    });
    
    // Клубы
    elements.createClubBtn.addEventListener('click', createClub);
    elements.clubSearch.addEventListener('input', filterClubs);
    
    // Друзья
    elements.searchFriendBtn.addEventListener('click', searchFriends);
    elements.friendSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchFriends();
    });
}

function filterClubs() {
    const searchTerm = elements.clubSearch.value.toLowerCase();
    
    if (!searchTerm) {
        updateClubsDisplay(state.clubs);
        return;
    }
    
    const filteredClubs = state.clubs.filter(club => 
        club.name.toLowerCase().includes(searchTerm) ||
        club.description.toLowerCase().includes(searchTerm) ||
        getGenreName(club.genre).toLowerCase().includes(searchTerm)
    );
    
    updateClubsDisplay(filteredClubs);
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ==============================================
async function init() {
    console.log('Инициализация приложения...');
    
    // Настраиваем рейтинг
    setupRatingStars();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Проверяем авторизацию
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            state.currentUser = JSON.parse(savedUser);
            state.isLoggedIn = true;
            showMainContent();
            navigateTo('shelf');
            showNotification('Автоматический вход выполнен', 'info');
        } catch (error) {
            localStorage.removeItem('currentUser');
            showWelcomeScreen();
        }
    } else {
        showWelcomeScreen();
    }
    
    // Инициализируем демо-данные если нужно
    await initDemoData();
    
    console.log('Приложение инициализировано');
}

// ==============================================
// ДЕМО-ДАННЫЕ
// ==============================================
async function initDemoData() {
    // Проверяем, есть ли пользователи в базе
    const usersSnapshot = await db.collection('users').limit(1).get();
    
    if (usersSnapshot.empty) {
        // Создаем демо-пользователя
        const demoUser = {
            username: 'nick',
            password: 'password123',
            email: 'demo@example.com',
            bio: 'Любитель книг и хорошей компании',
            createdAt: new Date().toISOString(),
            books: [],
            friends: [],
            clubs: [],
            friendRequests: []
        };
        
        await db.collection('users').add(demoUser);
        
        // Создаем демо-клубы
        const demoClubs = [
            {
                name: 'Фэнтези-мир',
                genre: 'fantasy',
                description: 'Клуб для любителей фэнтези. Обсуждаем Толкиена, Сапковского и других авторов.',
                ownerId: 'demo',
                ownerName: 'Администратор',
                members: ['demo'],
                membersCount: 1,
                createdAt: new Date().toISOString(),
                discussions: []
            },
            {
                name: 'Классика навсегда',
                genre: 'classic',
                description: 'Клуб ценителей классической литературы. От Достоевского до Толстого.',
                ownerId: 'demo',
                ownerName: 'Администратор',
                members: ['demo'],
                membersCount: 1,
                createdAt: new Date().toISOString(),
                discussions: []
            },
            {
                name: 'Научная фантастика',
                genre: 'scifi',
                description: 'Все о научной фантастике: от Азимова до Лема.',
                ownerId: 'demo',
                ownerName: 'Администратор',
                members: ['demo'],
                membersCount: 1,
                createdAt: new Date().toISOString(),
                discussions: []
            }
        ];
        
        for (const club of demoClubs) {
            await db.collection('clubs').add(club);
        }
        
        console.log('Демо-данные созданы');
    }
}

// ==============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ==============================================
document.addEventListener('DOMContentLoaded', init);
