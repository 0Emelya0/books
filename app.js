// ==============================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ==============================================
const state = {
    currentUser: null,
    currentShelf: 'read',
    currentRating: 0,
    isLoggedIn: false,
    users: [],
    books: []
};

// ==============================================
// ДЕМО-ДАННЫЕ
// ==============================================
const DEMO_USERS = [
    {
        id: '1',
        firstName: 'Иван',
        lastName: 'Петров',
        password: '123',
        books: ['1', '2', '3']
    },
    {
        id: '2',
        firstName: 'Мария',
        lastName: 'Сидорова',
        password: '123',
        books: ['4', '5']
    },
    {
        id: '3',
        firstName: 'Алексей',
        lastName: 'Иванов',
        password: '123',
        books: ['6']
    }
];

const DEMO_BOOKS = [
    {
        id: '1',
        title: 'Мастер и Маргарита',
        author: 'Михаил Булгаков',
        status: 'read',
        review: 'Великолепная книга о любви и добре!',
        rating: 5,
        userId: '1',
        userName: 'Иван Петров',
        addedAt: '2024-01-15'
    },
    {
        id: '2',
        title: 'Преступление и наказание',
        author: 'Фёдор Достоевский',
        status: 'read',
        review: 'Глубокое произведение о человеческой душе',
        rating: 4,
        userId: '1',
        userName: 'Иван Петров',
        addedAt: '2024-01-20'
    },
    {
        id: '3',
        title: '1984',
        author: 'Джордж Оруэлл',
        status: 'reading',
        review: '',
        rating: 0,
        userId: '1',
        userName: 'Иван Петров',
        addedAt: '2024-02-01'
    },
    {
        id: '4',
        title: 'Маленький принц',
        author: 'Антуан де Сент-Экзюпери',
        status: 'read',
        review: 'Трогательная история для всех возрастов',
        rating: 5,
        userId: '2',
        userName: 'Мария Сидорова',
        addedAt: '2024-01-10'
    },
    {
        id: '5',
        title: 'Гарри Поттер и философский камень',
        author: 'Джоан Роулинг',
        status: 'want',
        review: '',
        rating: 0,
        userId: '2',
        userName: 'Мария Сидорова',
        addedAt: '2024-02-05'
    },
    {
        id: '6',
        title: 'Война и мир',
        author: 'Лев Толстой',
        status: 'reading',
        review: 'Монументальное произведение',
        rating: 4,
        userId: '3',
        userName: 'Алексей Иванов',
        addedAt: '2024-01-25'
    }
];

// ==============================================
// ИНИЦИАЛИЗАЦИЯ ДАННЫХ
// ==============================================
function initData() {
    // Загружаем данные из localStorage или используем демо-данные
    const savedUsers = localStorage.getItem('bookshelf_users');
    const savedBooks = localStorage.getItem('bookshelf_books');
    
    if (savedUsers && savedBooks) {
        state.users = JSON.parse(savedUsers);
        state.books = JSON.parse(savedBooks);
    } else {
        state.users = DEMO_USERS;
        state.books = DEMO_BOOKS;
        saveData();
    }
}

function saveData() {
    localStorage.setItem('bookshelf_users', JSON.stringify(state.users));
    localStorage.setItem('bookshelf_books', JSON.stringify(state.books));
}

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
        background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
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

// Добавляем стили для анимации уведомлений
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

// ==============================================
// DOM ЭЛЕМЕНТЫ
// ==============================================
const elements = {
    // Навигация
    welcomeScreen: document.getElementById('welcomeScreen'),
    mainContent: document.getElementById('mainContent'),
    authButtons: document.getElementById('authButtons'),
    userMenu: document.getElementById('userMenu'),
    userName: document.getElementById('userName'),
    fullUserName: document.getElementById('fullUserName'),
    menuToggle: document.getElementById('menuToggle'),
    navLinks: document.getElementById('navLinks'),
    
    // Кнопки авторизации
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    welcomeLoginBtn: document.getElementById('welcomeLoginBtn'),
    
    // Модальное окно
    authModal: document.getElementById('authModal'),
    closeModal: document.getElementById('closeModal'),
    loginTab: document.getElementById('loginTab'),
    registerTab: document.getElementById('registerTab'),
    modalTitle: document.getElementById('modalTitle'),
    authForm: document.getElementById('authForm'),
    authSubmitBtn: document.getElementById('authSubmitBtn'),
    submitText: document.getElementById('submitText'),
    
    // Поля формы
    firstName: document.getElementById('firstName'),
    lastName: document.getElementById('lastName'),
    authPassword: document.getElementById('authPassword'),
    
    // Книги
    addBookBtn: document.getElementById('addBookBtn'),
    bookTitle: document.getElementById('bookTitle'),
    bookAuthor: document.getElementById('bookAuthor'),
    bookStatus: document.getElementById('bookStatus'),
    bookReview: document.getElementById('bookReview'),
    ratingStars: document.querySelectorAll('.star'),
    ratingValue: document.getElementById('ratingValue'),
    booksGrid: document.getElementById('booksGrid'),
    booksCount: document.getElementById('booksCount'),
    
    // Полки
    shelfTabs: document.querySelectorAll('.shelf-tab'),
    
    // Социальное
    friendsList: document.getElementById('friendsList'),
    clubsList: document.getElementById('clubsList'),
    
    // Навигационные ссылки
    homeLink: document.getElementById('homeLink'),
    profileLink: document.getElementById('profileLink'),
    clubsLink: document.getElementById('clubsLink'),
    friendsLink: document.getElementById('friendsLink')
};

// ==============================================
// АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ
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
    elements.modalTitle.textContent = isLogin ? 'Вход в систему' : 'Регистрация';
    elements.submitText.textContent = isLogin ? 'Войти' : 'Зарегистрироваться';
}

function handleAuthSubmit(e) {
    e.preventDefault();
    
    const isLogin = elements.loginTab.classList.contains('active');
    const firstName = elements.firstName.value.trim();
    const lastName = elements.lastName.value.trim();
    const password = elements.authPassword.value.trim();
    
    // Валидация
    if (!firstName || !lastName || !password) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    if (password.length < 3) {
        showNotification('Пароль должен быть не менее 3 символов', 'error');
        return;
    }
    
    if (isLogin) {
        loginUser(firstName, lastName, password);
    } else {
        registerUser(firstName, lastName, password);
    }
}

function loginUser(firstName, lastName, password) {
    const user = state.users.find(u => 
        u.firstName.toLowerCase() === firstName.toLowerCase() && 
        u.lastName.toLowerCase() === lastName.toLowerCase() && 
        u.password === password
    );
    
    if (user) {
        state.currentUser = user;
        state.isLoggedIn = true;
        
        // Сохраняем в localStorage
        localStorage.setItem('bookshelf_currentUser', JSON.stringify(user));
        
        hideAuthModal();
        showMainContent();
        showNotification(`Добро пожаловать, ${firstName} ${lastName}!`, 'success');
    } else {
        showNotification('Неверные имя, фамилия или пароль', 'error');
    }
}

function registerUser(firstName, lastName, password) {
    // Проверяем, существует ли уже пользователь
    const userExists = state.users.some(u => 
        u.firstName.toLowerCase() === firstName.toLowerCase() && 
        u.lastName.toLowerCase() === lastName.toLowerCase()
    );
    
    if (userExists) {
        showNotification('Пользователь с таким именем и фамилией уже существует', 'error');
        return;
    }
    
    // Создаем нового пользователя
    const newUser = {
        id: Date.now().toString(),
        firstName: firstName,
        lastName: lastName,
        password: password,
        books: []
    };
    
    state.users.push(newUser);
    state.currentUser = newUser;
    state.isLoggedIn = true;
    
    // Сохраняем данные
    saveData();
    localStorage.setItem('bookshelf_currentUser', JSON.stringify(newUser));
    
    hideAuthModal();
    showMainContent();
    showNotification('Регистрация прошла успешно! Добро пожаловать!', 'success');
}

function logout() {
    state.currentUser = null;
    state.isLoggedIn = false;
    localStorage.removeItem('bookshelf_currentUser');
    showWelcomeScreen();
    showNotification('Вы успешно вышли из системы', 'info');
}

// ==============================================
// РЕЙТИНГ КНИГ
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

// ==============================================
// РАБОТА С КНИГАМИ
// ==============================================
function addBook() {
    if (!state.currentUser) {
        showNotification('Пожалуйста, войдите в систему', 'error');
        return;
    }
    
    const title = elements.bookTitle.value.trim();
    const author = elements.bookAuthor.value.trim();
    const status = elements.bookStatus.value;
    const review = elements.bookReview.value.trim();
    const rating = state.currentRating;
    
    if (!title || !author) {
        showNotification('Пожалуйста, заполните название и автора', 'error');
        return;
    }
    
    // Создаем новую книгу
    const newBook = {
        id: Date.now().toString(),
        title: title,
        author: author,
        status: status,
        review: review || '',
        rating: rating,
        userId: state.currentUser.id,
        userName: `${state.currentUser.firstName} ${state.currentUser.lastName}`,
        addedAt: new Date().toISOString().split('T')[0]
    };
    
    // Добавляем книгу в общий список
    state.books.push(newBook);
    
    // Добавляем ID книги к пользователю
    if (!state.currentUser.books) {
        state.currentUser.books = [];
    }
    state.currentUser.books.push(newBook.id);
    
    // Обновляем пользователя в списке
    const userIndex = state.users.findIndex(u => u.id === state.currentUser.id);
    if (userIndex !== -1) {
        state.users[userIndex] = state.currentUser;
    }
    
    // Сохраняем данные
    saveData();
    localStorage.setItem('bookshelf_currentUser', JSON.stringify(state.currentUser));
    
    // Очищаем форму
    elements.bookTitle.value = '';
    elements.bookAuthor.value = '';
    elements.bookReview.value = '';
    state.currentRating = 0;
    updateRatingStars();
    
    // Обновляем отображение
    loadBooks();
    showNotification('Книга успешно добавлена на полку!', 'success');
}

function loadBooks() {
    if (!state.currentUser) return;
    
    // Получаем книги пользователя
    const userBooks = state.books.filter(book => 
        book.userId === state.currentUser.id && book.status === state.currentShelf
    );
    
    // Обновляем интерфейс
    updateBooksDisplay(userBooks);
    updateBooksCount();
}

function updateBooksDisplay(books) {
    const booksGrid = elements.booksGrid;
    
    if (books.length === 0) {
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
    
    books.forEach(book => {
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
            </div>
            <div class="book-date">
                Добавлено: ${book.addedAt}
            </div>
        </div>
    `;
    
    return card;
}

function updateBooksCount() {
    if (!state.currentUser) return;
    
    const userBooks = state.books.filter(book => book.userId === state.currentUser.id);
    const total = userBooks.length;
    const read = userBooks.filter(b => b.status === 'read').length;
    const reading = userBooks.filter(b => b.status === 'reading').length;
    const want = userBooks.filter(b => b.status === 'want').length;
    
    elements.booksCount.textContent = `${total} книг (${read} прочитано, ${reading} читаю, ${want} хочу)`;
}

function switchShelf(shelf) {
    state.currentShelf = shelf;
    
    // Обновляем активные вкладки
    elements.shelfTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.shelf === shelf);
    });
    
    // Загружаем книги для выбранной полки
    loadBooks();
}

// ==============================================
// СОЦИАЛЬНЫЕ ФУНКЦИИ
// ==============================================
function loadFriends() {
    if (!state.currentUser) return;
    
    // Получаем других пользователей (исключая текущего)
    const otherUsers = state.users.filter(user => user.id !== state.currentUser.id);
    
    const friendsList = elements.friendsList;
    
    if (otherUsers.length === 0) {
        friendsList.innerHTML = '<p class="empty-hint">Пока нет других пользователей</p>';
        return;
    }
    
    friendsList.innerHTML = '';
    
    otherUsers.forEach(user => {
        // Считаем книги пользователя
        const userBooks = state.books.filter(book => book.userId === user.id);
        const bookCount = userBooks.length;
        
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        
        friendItem.innerHTML = `
            <div class="friend-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="friend-info">
                <div class="friend-name">${user.firstName} ${user.lastName}</div>
                <div class="friend-stats">${bookCount} книг на полке</div>
            </div>
        `;
        
        friendsList.appendChild(friendItem);
    });
}

function loadClubs() {
    // Демо-клубы
    const clubs = [
        { name: 'Клуб классики', members: 42, currentBook: 'Война и мир' },
        { name: 'Фантастика будущего', members: 28, currentBook: 'Дюна' },
        { name: 'Современная проза', members: 35, currentBook: 'Нормальные люди' }
    ];
    
    const clubsList = elements.clubsList;
    clubsList.innerHTML = '';
    
    clubs.forEach(club => {
        const clubItem = document.createElement('div');
        clubItem.className = 'club-item';
        
        clubItem.innerHTML = `
            <div class="club-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="club-info">
                <div class="club-name">${club.name}</div>
                <p>${club.members} участников</p>
                <p class="club-current">Читают: "${club.currentBook}"</p>
            </div>
        `;
        
        clubsList.appendChild(clubItem);
    });
}

// ==============================================
// ОТОБРАЖЕНИЕ ИНТЕРФЕЙСА
// ==============================================
function showWelcomeScreen() {
    elements.welcomeScreen.style.display = 'block';
    elements.mainContent.style.display = 'none';
    elements.authButtons.style.display = 'flex';
    elements.userMenu.style.display = 'none';
    
    // Активируем навигацию
    activateNavigation();
}

function showMainContent() {
    elements.welcomeScreen.style.display = 'none';
    elements.mainContent.style.display = 'block';
    elements.authButtons.style.display = 'none';
    elements.userMenu.style.display = 'flex';
    
    if (state.currentUser) {
        elements.userName.textContent = `${state.currentUser.firstName} ${state.currentUser.lastName}`;
        elements.fullUserName.textContent = `${state.currentUser.firstName} ${state.currentUser.lastName}`;
        
        // Загружаем данные
        loadBooks();
        loadFriends();
        loadClubs();
    }
    
    // Активируем навигацию
    activateNavigation();
}

function activateNavigation() {
    // Активируем навигационные ссылки
    const navLinks = [elements.homeLink, elements.profileLink, elements.clubsLink, elements.friendsLink];
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // По умолчанию активируем главную
    if (state.isLoggedIn) {
        elements.profileLink.classList.add('active');
    } else {
        elements.homeLink.classList.add('active');
    }
}

// ==============================================
// НАСТРОЙКА СОБЫТИЙ
// ==============================================
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Кнопки авторизации
    elements.loginBtn.addEventListener('click', () => {
        console.log('Кнопка входа нажата');
        showAuthModal('login');
    });
    
    elements.registerBtn.addEventListener('click', () => {
        console.log('Кнопка регистрации нажата');
        showAuthModal('register');
    });
    
    elements.welcomeLoginBtn.addEventListener('click', () => {
        console.log('Кнопка "Начать чтение" нажата');
        showAuthModal('login');
    });
    
    elements.logoutBtn.addEventListener('click', logout);
    
    // Модальное окно
    elements.closeModal.addEventListener('click', hideAuthModal);
    elements.loginTab.addEventListener('click', () => switchAuthTab('login'));
    elements.registerTab.addEventListener('click', () => switchAuthTab('register'));
    
    // Форма авторизации
    elements.authForm.addEventListener('submit', handleAuthSubmit);
    
    // Книги
    elements.addBookBtn.addEventListener('click', addBook);
    
    // Полки
    elements.shelfTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            console.log('Переключение полки:', tab.dataset.shelf);
            switchShelf(tab.dataset.shelf);
        });
    });
    
    // Навигация
    elements.menuToggle.addEventListener('click', () => {
        elements.navLinks.classList.toggle('active');
    });
    
    elements.navLinks.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-link')) {
            elements.navLinks.classList.remove('active');
        }
    });
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (e) => {
        if (e.target === elements.authModal) {
            hideAuthModal();
        }
    });
    
    // Навигационные ссылки
    elements.homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.isLoggedIn) {
            switchShelf('read');
        } else {
            showWelcomeScreen();
        }
        activateNavigation();
    });
    
    elements.profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.isLoggedIn) {
            showMainContent();
            switchShelf('read');
            activateNavigation();
        }
    });
    
    elements.clubsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.isLoggedIn) {
            showNotification('Раздел клубов в разработке', 'info');
        }
    });
    
    elements.friendsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.isLoggedIn) {
            showNotification('Раздел друзей в разработке', 'info');
        }
    });
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ==============================================
function init() {
    console.log('Инициализация приложения...');
    
    // Инициализируем данные
    initData();
    
    // Настраиваем рейтинг
    setupRatingStars();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem('bookshelf_currentUser');
    if (savedUser) {
        try {
            state.currentUser = JSON.parse(savedUser);
            state.isLoggedIn = true;
            showMainContent();
            showNotification('Автоматический вход выполнен', 'info');
        } catch (error) {
            localStorage.removeItem('bookshelf_currentUser');
            showWelcomeScreen();
        }
    } else {
        showWelcomeScreen();
    }
    
    console.log('Приложение инициализировано');
}

// ==============================================
// ЗАПУСК ПРИЛОЖЕНИЯ
// ==============================================
document.addEventListener('DOMContentLoaded', init);
