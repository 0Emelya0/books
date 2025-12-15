// Firebase конфигурация
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
const auth = firebase.auth();
const db = firebase.firestore();

// Состояние приложения
const state = {
    currentUser: null,
    currentShelf: 'read',
    currentRating: 0
};

// DOM элементы
const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    mainContent: document.getElementById('mainContent'),
    authButtons: document.getElementById('authButtons'),
    userMenu: document.getElementById('userMenu'),
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    authModal: document.getElementById('authModal'),
    modalTitle: document.getElementById('modalTitle'),
    loginTab: document.getElementById('loginTab'),
    registerTab: document.getElementById('registerTab'),
    authForm: document.getElementById('authForm'),
    authEmail: document.getElementById('authEmail'),
    authPassword: document.getElementById('authPassword'),
    authName: document.getElementById('authName'),
    authSubmitBtn: document.getElementById('authSubmitBtn'),
    registerFields: document.getElementById('registerFields'),
    googleAuthBtn: document.getElementById('googleAuthBtn'),
    closeModal: document.querySelector('.close'),
    addBookBtn: document.getElementById('addBookBtn'),
    bookTitle: document.getElementById('bookTitle'),
    bookAuthor: document.getElementById('bookAuthor'),
    bookStatus: document.getElementById('bookStatus'),
    bookReview: document.getElementById('bookReview'),
    ratingStars: document.getElementById('ratingStars'),
    booksGrid: document.getElementById('booksGrid'),
    shelfTabs: document.querySelectorAll('.shelf-tab'),
    friendsList: document.getElementById('friendsList'),
    clubsList: document.getElementById('clubsList')
};

// Инициализация приложения
function init() {
    setupEventListeners();
    showLoadingScreen();
    
    // Проверка авторизации
    auth.onAuthStateChanged((user) => {
        if (user) {
            state.currentUser = user;
            showMainContent();
            loadUserData();
        } else {
            state.currentUser = null;
            showWelcomeScreen();
        }
        hideLoadingScreen();
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки авторизации
    elements.loginBtn.addEventListener('click', () => showAuthModal('login'));
    elements.registerBtn.addEventListener('click', () => showAuthModal('register'));
    elements.logoutBtn.addEventListener('click', logout);
    
    // Модальное окно
    elements.closeModal.addEventListener('click', hideAuthModal);
    elements.loginTab.addEventListener('click', () => switchAuthTab('login'));
    elements.registerTab.addEventListener('click', () => switchAuthTab('register'));
    
    // Форма авторизации
    elements.authForm.addEventListener('submit', handleAuthSubmit);
    elements.googleAuthBtn.addEventListener('click', signInWithGoogle);
    
    // Книги
    elements.addBookBtn.addEventListener('click', addBook);
    elements.shelfTabs.forEach(tab => {
        tab.addEventListener('click', () => switchShelf(tab.dataset.shelf));
    });
    
    // Звезды рейтинга
    elements.ratingStars.addEventListener('click', (e) => {
        if (e.target.tagName === 'I') {
            setRating(parseInt(e.target.dataset.rating));
        }
    });
    
    // Клик вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target === elements.authModal) {
            hideAuthModal();
        }
    });
}

// Работа с загрузкой
function showLoadingScreen() {
    elements.loadingScreen.style.display = 'block';
    elements.welcomeScreen.style.display = 'none';
    elements.mainContent.style.display = 'none';
}

function hideLoadingScreen() {
    elements.loadingScreen.style.display = 'none';
}

function showWelcomeScreen() {
    elements.welcomeScreen.style.display = 'block';
    elements.mainContent.style.display = 'none';
    elements.authButtons.style.display = 'flex';
    elements.userMenu.style.display = 'none';
}

function showMainContent() {
    elements.welcomeScreen.style.display = 'none';
    elements.mainContent.style.display = 'block';
    elements.authButtons.style.display = 'none';
    elements.userMenu.style.display = 'flex';
    elements.userName.textContent = state.currentUser.displayName || state.currentUser.email;
    elements.userAvatar.src = state.currentUser.photoURL || 'https://via.placeholder.com/40';
}

// Работа с авторизацией
function showAuthModal(type = 'login') {
    elements.authModal.style.display = 'block';
    switchAuthTab(type);
}

function hideAuthModal() {
    elements.authModal.style.display = 'none';
    elements.authForm.reset();
}

function switchAuthTab(type) {
    const isLogin = type === 'login';
    
    elements.loginTab.classList.toggle('active', isLogin);
    elements.registerTab.classList.toggle('active', !isLogin);
    elements.modalTitle.textContent = isLogin ? 'Вход' : 'Регистрация';
    elements.authSubmitBtn.textContent = isLogin ? 'Войти' : 'Зарегистрироваться';
    elements.registerFields.style.display = isLogin ? 'none' : 'block';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const email = elements.authEmail.value;
    const password = elements.authPassword.value;
    const name = elements.authName.value;
    const isLogin = elements.loginTab.classList.contains('active');
    
    try {
        if (isLogin) {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({
                displayName: name
            });
            
            // Создаем профиль пользователя в Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                createdAt: new Date(),
                friends: [],
                clubs: []
            });
        }
        
        hideAuthModal();
        showNotification(isLogin ? 'Вход выполнен успешно!' : 'Регистрация прошла успешно!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const userCredential = await auth.signInWithPopup(provider);
        
        // Проверяем, есть ли пользователь в базе
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
        if (!userDoc.exists) {
            // Создаем профиль для нового пользователя
            await db.collection('users').doc(userCredential.user.uid).set({
                name: userCredential.user.displayName,
                email: userCredential.user.email,
                photoURL: userCredential.user.photoURL,
                createdAt: new Date(),
                friends: [],
                clubs: []
            });
        }
        
        hideAuthModal();
        showNotification('Вход выполнен успешно!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function logout() {
    try {
        await auth.signOut();
        showNotification('Вы успешно вышли из системы', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Работа с книгами
function setRating(rating) {
    state.currentRating = rating;
    const stars = elements.ratingStars.querySelectorAll('i');
    stars.forEach((star, index) => {
        star.classList.toggle('fas', index < rating);
        star.classList.toggle('far', index >= rating);
    });
}

async function addBook() {
    if (!state.currentUser) return;
    
    const book = {
        title: elements.bookTitle.value,
        author: elements.bookAuthor.value,
        status: elements.bookStatus.value,
        review: elements.bookReview.value,
        rating: state.currentRating,
        userId: state.currentUser.uid,
        createdAt: new Date()
    };
    
    if (!book.title || !book.author) {
        showNotification('Пожалуйста, заполните название и автора', 'error');
        return;
    }
    
    try {
        await db.collection('books').add(book);
        
        // Очищаем форму
        elements.bookTitle.value = '';
        elements.bookAuthor.value = '';
        elements.bookReview.value = '';
        setRating(0);
        
        showNotification('Книга успешно добавлена!', 'success');
        loadBooks();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function loadBooks() {
    if (!state.currentUser) return;
    
    try {
        const booksSnapshot = await db.collection('books')
            .where('userId', '==', state.currentUser.uid)
            .where('status', '==', state.currentShelf)
            .orderBy('createdAt', 'desc')
            .get();
        
        elements.booksGrid.innerHTML = '';
        
        booksSnapshot.forEach(doc => {
            const book = doc.data();
            const bookCard = createBookCard(book);
            elements.booksGrid.appendChild(bookCard);
        });
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

function createBookCard(book) {
    const div = document.createElement('div');
    div.className = 'book-card';
    
    const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
    
    div.innerHTML = `
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">${book.author}</p>
        <div class="book-rating">${stars}</div>
        ${book.review ? `<p class="book-review">"${book.review}"</p>` : ''}
        <div class="book-meta">
            <small>${book.createdAt.toDate().toLocaleDateString()}</small>
        </div>
    `;
    
    return div;
}

function switchShelf(shelf) {
    state.currentShelf = shelf;
    
    // Обновляем активную вкладку
    elements.shelfTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.shelf === shelf);
    });
    
    // Загружаем книги для выбранной полки
    loadBooks();
}

// Загрузка пользовательских данных
async function loadUserData() {
    loadBooks();
    loadFriends();
    loadClubs();
}

async function loadFriends() {
    // Здесь можно добавить загрузку друзей
    // Для демо просто покажем заглушку
    elements.friendsList.innerHTML = `
        <div class="friend-item">
            <img src="https://via.placeholder.com/40" alt="Друг">
            <div>
                <strong>Алексей Книголюбов</strong>
                <small>12 книг на полке</small>
            </div>
        </div>
        <div class="friend-item">
            <img src="https://via.placeholder.com/40" alt="Друг">
            <div>
                <strong>Мария Читайкина</strong>
                <small>8 книг на полке</small>
            </div>
        </div>
    `;
}

async function loadClubs() {
    // Здесь можно добавить загрузку клубов
    elements.clubsList.innerHTML = `
        <div class="club-item">
            <i class="fas fa-users"></i>
            <div>
                <strong>Клуб классики</strong>
                <small>Обсуждаем: "Война и мир"</small>
            </div>
        </div>
        <div class="club-item">
            <i class="fas fa-users"></i>
            <div>
                <strong>Фантастика будущего</strong>
                <small>Обсуждаем: "Дюна"</small>
            </div>
        </div>
    `;
}

// Уведомления
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Анимации для уведомлений
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

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);
