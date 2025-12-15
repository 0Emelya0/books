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
    console.log("Firebase инициализирован успешно");
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
}

const db = firebase.firestore();

// ==============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==============================================
let currentUser = null;
let currentRating = 0;
let userBooks = [];

// ==============================================
// УТИЛИТЫ
// ==============================================
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Стили для уведомления
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
    
    // Анимация выхода
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Добавляем стили для анимации
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
    console.log(`Переключаемся на страницу: ${pageId}`);
    
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
        
        // Обновить фон в зависимости от страницы
        document.body.className = `${pageId}-page`;
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
            console.log("Загружаем книги для полки...");
            loadBooks();
        } else if (pageId === 'clubs') {
            console.log("Загружаем клубы...");
            loadClubs();
        } else if (pageId === 'friends') {
            console.log("Загружаем друзей...");
            // loadFriends();
        }
    }
}

// ==============================================
// АВТОРИЗАЦИЯ
// ==============================================
function showAuthModal(tab = 'login') {
    console.log(`Показываем модальное окно: ${tab}`);
    
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
    console.log("Скрываем модальное окно");
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
        // Очищаем форму
        const form = document.getElementById('authForm');
        if (form) form.reset();
    }
}

async function handleAuth(e) {
    e.preventDefault();
    console.log("Обработка авторизации");
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const activeTab = document.querySelector('.tab-btn.active');
    
    if (!usernameInput || !passwordInput || !activeTab) {
        showNotification('Ошибка формы', 'error');
        return;
    }
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const isLogin = activeTab.dataset.tab === 'login';
    
    if (!username || !password) {
        showNotification('Введите никнейм и пароль', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('Никнейм должен быть не менее 3 символов', 'error');
        return;
    }
    
    if (password.length < 3) {
        showNotification('Пароль должен быть не менее 3 символов', 'error');
        return;
    }
    
    try {
        if (isLogin) {
            await loginUser(username, password);
        } else {
            await registerUser(username, password);
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        showNotification(error.message, 'error');
    }
}

async function loginUser(username, password) {
    console.log(`Попытка входа: ${username}`);
    
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
        
        console.log('Пользователь найден:', currentUser);
        
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
    console.log(`Регистрация нового пользователя: ${username}`);
    
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
        
        console.log('Пользователь создан:', currentUser);
        
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
    console.log("Выход из системы");
    
    currentUser = null;
    userBooks = [];
    
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
        console.log("Обновление интерфейса для пользователя:", currentUser.username);
        
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
// КНИГИ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ==============================================
function setupRatingStars() {
    const stars = document.querySelectorAll('.stars i');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const value = parseInt(this.dataset.value);
            setRating(value);
        });
        
        star.addEventListener('mouseover', function() {
            const value = parseInt(this.dataset.value);
            highlightStars(value);
        });
        
        star.addEventListener('mouseout', function() {
            updateRatingStars();
        });
    });
    
    // Инициализируем рейтинг
    updateRatingStars();
}

function highlightStars(rating) {
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
}

function updateRatingStars() {
    const stars = document.querySelectorAll('.stars i');
    stars.forEach((star, index) => {
        if (index < currentRating) {
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
        ratingValue.textContent = `${currentRating}/5`;
    }
}

function setRating(rating) {
    currentRating = rating;
    updateRatingStars();
}

async function addBook() {
    console.log("Добавление новой книги");
    
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
        
        console.log("Добавляем книгу в Firestore:", bookData);
        
        // Добавляем книгу в Firestore
        const docRef = await db.collection('books').add(bookData);
        const bookId = docRef.id;
        console.log("Книга добавлена с ID:", bookId);
        
        // Добавляем ID книги пользователю
        await db.collection('users').doc(currentUser.id).update({
            books: firebase.firestore.FieldValue.arrayUnion(bookId)
        });
        
        // Добавляем книгу в локальный массив
        userBooks.push({
            id: bookId,
            ...bookData
        });
        
        // Очищаем форму
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookAuthor').value = '';
        document.getElementById('bookReview').value = '';
        document.getElementById('bookGenre').value = '';
        currentRating = 0;
        updateRatingStars();
        
        // Обновляем отображение
        updateBooksDisplay();
        updateBookCounts();
        
        showNotification('Книга добавлена на полку!', 'success');
        
    } catch (error) {
        console.error('Ошибка добавления книги:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

async function loadBooks() {
    console.log("Загрузка книг пользователя");
    
    if (!currentUser) {
        console.log("Нет текущего пользователя");
        return;
    }
    
    try {
        // Получаем книги пользователя
        const booksRef = db.collection('books');
        const snapshot = await booksRef
            .where('userId', '==', currentUser.id)
            .orderBy('createdAt', 'desc')
            .get();
        
        console.log(`Найдено ${snapshot.size} книг`);
        
        userBooks = [];
        snapshot.forEach(doc => {
            const bookData = doc.data();
            userBooks.push({
                id: doc.id,
                ...bookData
            });
        });
        
        console.log("Загруженные книги:", userBooks);
        
        // Обновляем отображение
        updateBooksDisplay();
        updateBookCounts();
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        showNotification('Ошибка загрузки книг', 'error');
    }
}

function updateBooksDisplay() {
    console.log("Обновление отображения книг");
    
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) {
        console.error("Элемент booksGrid не найден!");
        return;
    }
    
    if (userBooks.length === 0) {
        console.log("Нет книг для отображения");
        booksGrid.innerHTML = '<p class="empty">Пока нет книг. Добавьте первую!</p>';
        return;
    }
    
    // Фильтруем по активной вкладке
    const activeTab = document.querySelector('.tab.active');
    const status = activeTab ? activeTab.dataset.status : 'read';
    const filteredBooks = userBooks.filter(book => book.status === status);
    
    console.log(`Отображаем книги со статусом ${status}:`, filteredBooks.length, "шт.");
    
    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = `<p class="empty">На этой полке пока нет книг</p>`;
        return;
    }
    
    booksGrid.innerHTML = filteredBooks.map(book => `
        <div class="book-card">
            <h4>${book.title}</h4>
            <p class="book-meta"><strong>Автор:</strong> ${book.author}</p>
            <p class="book-meta"><strong>Жанр:</strong> ${book.genre}</p>
            <p class="book-meta"><strong>Оценка:</strong> ${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}</p>
            ${book.review ? `<p class="review"><strong>Рецензия:</strong> "${book.review}"</p>` : ''}
            <div class="book-actions">
                <small><strong>Добавлено:</strong> ${new Date(book.createdAt).toLocaleDateString('ru-RU')}</small>
            </div>
        </div>
    `).join('');
    
    console.log("Книги отображены успешно");
}

function updateBookCounts() {
    if (!currentUser || userBooks.length === 0) return;
    
    const total = userBooks.length;
    const read = userBooks.filter(b => b.status === 'read').length;
    const reading = userBooks.filter(b => b.status === 'reading').length;
    const want = userBooks.filter(b => b.status === 'want').length;
    
    const bookCount = document.getElementById('bookCount');
    const readCount = document.getElementById('readCount');
    const readingCount = document.getElementById('readingCount');
    const wantCount = document.getElementById('wantCount');
    
    if (bookCount) {
        bookCount.textContent = `${total} книг`;
        console.log(`Общее количество книг: ${total}`);
    }
    if (readCount) {
        readCount.textContent = read;
        console.log(`Прочитано: ${read}`);
    }
    if (readingCount) {
        readingCount.textContent = reading;
        console.log(`Читаю сейчас: ${reading}`);
    }
    if (wantCount) {
        wantCount.textContent = want;
        console.log(`Хочу прочитать: ${want}`);
    }
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
        
        showNotification('Клуб создан!', 'success');
        
        // Обновляем отображение
        await loadClubs();
        
    } catch (error) {
        console.error('Ошибка создания клуба:', error);
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
        showNotification('Ошибка загрузки клубов', 'error');
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
                <p class="club-meta"><strong>Жанр:</strong> ${club.genre}</p>
                <p class="club-meta"><strong>Создатель:</strong> ${club.ownerName}</p>
                <p class="club-meta"><strong>Участников:</strong> ${club.membersCount}</p>
                <p><strong>Описание:</strong> ${club.description}</p>
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
        
    } catch (error) {
        console.error('Ошибка вступления в клуб:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

// ==============================================
// НАСТРОЙКА СОБЫТИЙ
// ==============================================
function setupEventListeners() {
    console.log("Настройка обработчиков событий...");
    
    // Навигация
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            console.log(`Клик по навигации: ${page}`);
            
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
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log("Клик по кнопке Войти");
            showAuthModal('login');
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            console.log("Клик по кнопке Регистрация");
            showAuthModal('register');
        });
    }
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log("Клик по кнопке Начать");
            showAuthModal('login');
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Модальное окно
    const closeBtn = document.querySelector('.close');
    const authForm = document.getElementById('authForm');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', hideAuthModal);
    }
    
    if (authForm) {
        authForm.addEventListener('submit', handleAuth);
    }
    
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
            console.log(`Переключение вкладки на: ${tab}`);
            
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
    const addBookBtn = document.getElementById('addBookBtn');
    if (addBookBtn) {
        addBookBtn.addEventListener('click', addBook);
    }
    
    // Звезды рейтинга
    setupRatingStars();
    
    // Вкладки полок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const status = this.dataset.status;
            console.log(`Переключение полки на: ${status}`);
            
            // Обновить активную вкладку
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Обновить отображение книг
            updateBooksDisplay();
        });
    });
    
    // Клубы
    const createClubBtn = document.getElementById('createClubBtn');
    if (createClubBtn) {
        createClubBtn.addEventListener('click', createClub);
    }
    
    // Мобильное меню
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const navLinks = document.querySelector('.nav-links');
            navLinks.classList.toggle('active');
        });
    }
    
    console.log("Обработчики событий настроены успешно");
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ ДЕМО-ДАННЫХ
// ==============================================
async function initDemoData() {
    try {
        console.log("Инициализация демо-данных...");
        
        // Проверяем, есть ли демо-пользователь
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('username', '==', 'user').limit(1).get();
        
        if (snapshot.empty) {
            console.log("Создаем демо-пользователя...");
            
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
            console.log("Демо-пользователь создан успешно");
        } else {
            console.log("Демо-пользователь уже существует");
        }
        
        // Проверяем, есть ли демо-книги
        const booksRef = db.collection('books');
        const booksSnapshot = await booksRef.limit(1).get();
        
        if (booksSnapshot.empty) {
            console.log("Демо-книг нет, можно добавить тестовые");
        }
        
    } catch (error) {
        console.error('Ошибка инициализации демо-данных:', error);
    }
}

// ==============================================
// ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ
// ==============================================
async function init() {
    console.log("====== ЗАПУСК ПРИЛОЖЕНИЯ ======");
    
    // Проверяем подключение к Firebase
    try {
        const testRef = db.collection('test');
        await testRef.limit(1).get();
        console.log("Подключение к Firestore успешно");
    } catch (error) {
        console.error("Ошибка подключения к Firestore:", error);
        showNotification("Ошибка подключения к базе данных", "error");
    }
    
    // Инициализируем демо-данные
    await initDemoData();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Настраиваем рейтинг
    setupRatingStars();
    
    // Проверяем сохраненную сессию
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log("Восстановлен пользователь из localStorage:", currentUser.username);
            updateUI();
            switchPage('shelf');
            await loadBooks();
            showNotification('Автоматический вход выполнен', 'info');
        } catch (error) {
            console.error("Ошибка восстановления пользователя:", error);
            localStorage.removeItem('currentUser');
        }
    }
    
    // Сохраняем пользователя при изменении
    if (currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    console.log("====== ПРИЛОЖЕНИЕ ЗАПУЩЕНО ======");
}

// Запускаем приложение при загрузке страницы
document.addEventListener('DOMContentLoaded', init);

// Для отладки: делаем функции глобальными
window.showNotification = showNotification;
window.loadBooks = loadBooks;
window.addBook = addBook;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logout = logout;
