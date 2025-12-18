    // Предотвращаем закрытие при клике внутри меню
    navLinks.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// ==============================================
// АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ
// ==============================================
function setupAuthModal() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.close');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const authForm = document.getElementById('authForm');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const submitText = document.getElementById('submitText');

    // Открытие модального окна
    loginBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    registerBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        switchAuthTab('register');
    });

    // Закрытие модального окна
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // Переключение вкладок
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchAuthTab(btn.dataset.tab);
        });
    });

    // Обработка формы
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const isLogin = submitText.textContent === 'Войти';
        
        if (!username || !password) {
            showNotification('Заполните все поля', 'error');
            return;
        }
        
        if (password.length < 6) {
            showNotification('Пароль должен быть не менее 6 символов', 'error');
            return;
        }

        if (isLogin) {
            await loginUser(username, password);
        } else {
            await registerUser(username, password);
        }
    });
}

function switchAuthTab(tab) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const submitText = document.getElementById('submitText');
    
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    submitText.textContent = tab === 'login' ? 'Войти' : 'Зарегистрироваться';
    
    // Демо данные для тестирования
    if (tab === 'login') {
        document.getElementById('username').value = 'demo';
        document.getElementById('password').value = 'demo123';
    } else {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}

async function registerUser(username, password) {
    try {
        showNotification('Регистрация...', 'info');
        
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('username', '==', username).get();
        
        if (!snapshot.empty) {
            showNotification('Пользователь уже существует', 'error');
            return;
        }
        
        const newUser = {
            username: username,
            password: password, // В реальном приложении нужно хешировать
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await usersRef.add(newUser);
        
        currentUser = {
            id: docRef.id,
            username: username
        };
        
        showNotification('Регистрация успешна!', 'success');
        updateUIForUser();
        saveSession();
        
        document.getElementById('authModal').style.display = 'none';
        document.body.style.overflow = 'auto';
        
        switchPage('shelf');
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification('Ошибка регистрации', 'error');
    }
}

async function loginUser(username, password) {
    try {
        showNotification('Вход...', 'info');
        
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('username', '==', username).get();
        
        if (snapshot.empty) {
            showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        
        // В реальном приложении нужно проверять хешированный пароль
        if (userData.password !== password) {
            showNotification('Неверный пароль', 'error');
            return;
        }
        
        currentUser = {
            id: userDoc.id,
            username: username
        };
        
        showNotification('Вход выполнен успешно!', 'success');
        updateUIForUser();
        saveSession();
        
        document.getElementById('authModal').style.display = 'none';
        document.body.style.overflow = 'auto';
        
        switchPage('shelf');
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification('Ошибка входа', 'error');
    }
}

async function autoLogin() {
    const session = restoreSession();
    if (session) {
        try {
            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('username', '==', session.username).get();
            
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                currentUser = {
                    id: userDoc.id,
                    username: session.username
                };
                
                updateUIForUser();
                switchPage('shelf');
                showNotification('Автоматический вход выполнен', 'success');
                return true;
            }
        } catch (error) {
            console.error('Ошибка автовхода:', error);
        }
    }
    return false;
}

function logout() {
    currentUser = null;
    localStorage.removeItem('bookShelfSession');
    
    document.getElementById('authModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    updateUIForUser();
    switchPage('home');
    showNotification('Выход выполнен', 'info');
}

function updateUIForUser() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenu = document.querySelector('.user-menu');
    const authButtons = document.querySelector('.auth-buttons');
    const userNameSpan = document.getElementById('userName');
    const currentUserSpan = document.getElementById('currentUser');
    
    if (currentUser) {
        userNameSpan.textContent = currentUser.username;
        if (currentUserSpan) {
            currentUserSpan.textContent = `Привет, ${currentUser.username}!`;
        }
        
        authButtons.classList.remove('active');
        userMenu.classList.add('active');
        userMenu.style.display = 'flex';
        
        // На мобильных устройствах
        if (window.innerWidth <= 768) {
            authButtons.style.display = 'none';
        }
    } else {
        userNameSpan.textContent = '';
        if (currentUserSpan) {
            currentUserSpan.textContent = 'Добро пожаловать!';
        }
        
        authButtons.classList.add('active');
        userMenu.classList.remove('active');
        userMenu.style.display = 'none';
        
        // На мобильных устройствах
        if (window.innerWidth <= 768) {
            authButtons.style.display = 'flex';
        }
    }
}

// ==============================================
// КНИЖНАЯ ПОЛКА
// ==============================================
function setupBookShelf() {
    // Рейтинг звездами
    const stars = document.querySelectorAll('.stars i');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.dataset.value);
            currentRating = value;
            
            stars.forEach((s, index) => {
                if (index < value) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                }
            });
            
            document.getElementById('ratingValue').textContent = `${value}/5`;
        });
    });

    // Добавление книги
    document.getElementById('addBookBtn').addEventListener('click', addBook);

    // Вкладки
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterBooks(tab.dataset.status);
        });
    });

    // Кнопка "Начать путешествие"
    document.getElementById('startBtn').addEventListener('click', () => {
        document.getElementById('loginBtn').click();
    });
}

async function addBook() {
    if (!currentUser) {
        showNotification('Сначала войдите в систему', 'error');
        return;
    }

    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const genre = document.getElementById('bookGenre').value;
    const status = document.getElementById('bookStatus').value;
    const review = document.getElementById('bookReview').value.trim();

    if (!title || !author || !genre) {
        showNotification('Заполните обязательные поля', 'error');
        return;
    }

    try {
        const bookData = {
            userId: currentUser.id,
            title: title,
            author: author,
            genre: genre,
            status: status,
            rating: currentRating,
            review: review,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('books').add(bookData);
        
        showNotification('Книга добавлена на полку!', 'success');
        
        // Очищаем форму
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookAuthor').value = '';
        document.getElementById('bookGenre').value = '';
        document.getElementById('bookStatus').value = 'read';
        document.getElementById('bookReview').value = '';
        
        // Сбрасываем рейтинг
        currentRating = 0;
        document.querySelectorAll('.stars i').forEach(star => {
            star.classList.remove('fas');
            star.classList.add('far');
        });
        document.getElementById('ratingValue').textContent = '0/5';
        
        // Обновляем список книг
        loadBooks();
    } catch (error) {
        console.error('Ошибка добавления книги:', error);
        showNotification('Ошибка добавления книги', 'error');
    }
}

async function loadBooks() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('books')
            .where('userId', '==', currentUser.id)
            .orderBy('createdAt', 'desc')
            .get();

        userBooks = [];
        snapshot.forEach(doc => {
            userBooks.push({ id: doc.id, ...doc.data() });
        });

        updateBookStats();
        displayBooks('read');
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        showNotification('Ошибка загрузки книг', 'error');
    }
}

function updateBookStats() {
    const total = userBooks.length;
    const read = userBooks.filter(book => book.status === 'read').length;
    const reading = userBooks.filter(book => book.status === 'reading').length;
    const want = userBooks.filter(book => book.status === 'want').length;

    document.getElementById('bookCount').textContent = `${total} книг`;
    document.getElementById('readCount').textContent = read;
    document.getElementById('readingCount').textContent = reading;
    document.getElementById('wantCount').textContent = want;
}

function displayBooks(status) {
    const booksGrid = document.getElementById('booksGrid');
    const filteredBooks = userBooks.filter(book => book.status === status);

    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = '<p class="empty">Пока нет книг в этой категории</p>';
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
    
    const statusIcons = {
        'read': 'fas fa-check-circle',
        'reading': 'fas fa-book-reader',
        'want': 'fas fa-heart'
    };
    
    const statusColors = {
        'read': 'var(--success)',
        'reading': 'var(--primary)',
        'want': 'var(--accent)'
    };
    
    const statusText = {
        'read': 'Прочитано',
        'reading': 'Читаю сейчас',
        'want': 'Хочу прочитать'
    };

    const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
    
    card.innerHTML = `
        <div style="position: relative; z-index: 1;">
            <h4>${book.title}</h4>
            <p class="book-meta"><strong>Автор:</strong> ${book.author}</p>
            <p class="book-meta"><strong>Жанр:</strong> ${book.genre}</p>
            <p class="book-meta"><strong>Статус:</strong> 
                <i class="${statusIcons[book.status]}" style="color: ${statusColors[book.status]}; margin-right: 5px;"></i>
                ${statusText[book.status]}
            </p>
            ${book.rating > 0 ? `<p class="book-meta"><strong>Оценка:</strong> ${stars}</p>` : ''}
            ${book.review ? `<div class="review">"${book.review}"</div>` : ''}
        </div>
    `;
    
    return card;
}

function filterBooks(status) {
    displayBooks(status);
}

// ==============================================
// КЛУБЫ
// ==============================================
function setupClubs() {
    document.getElementById('createClubBtn').addEventListener('click', createClub);
}

async function createClub() {
    if (!currentUser) {
        showNotification('Сначала войдите в систему', 'error');
        return;
    }

    const name = document.getElementById('clubName').value.trim();
    const genre = document.getElementById('clubGenre').value;
    const description = document.getElementById('clubDescription').value.trim();

    if (!name || !description) {
        showNotification('Заполните обязательные поля', 'error');
        return;
    }

    try {
        const clubData = {
            name: name,
            genre: genre,
            description: description,
            createdBy: currentUser.id,
            creatorName: currentUser.username,
            members: [currentUser.id],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('clubs').add(clubData);
        
        showNotification('Клуб создан успешно!', 'success');
        
        // Очищаем форму
        document.getElementById('clubName').value = '';
        document.getElementById('clubDescription').value = '';
        
        // Обновляем списки клубов
        loadClubs();
        loadMyClubs();
    } catch (error) {
        console.error('Ошибка создания клуба:', error);
        showNotification('Ошибка создания клуба', 'error');
    }
}

async function loadClubs() {
    try {
        const snapshot = await db.collection('clubs')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const clubsGrid = document.getElementById('clubsGrid');
        
        if (snapshot.empty) {
            clubsGrid.innerHTML = '<p class="empty">Пока нет клубов. Создайте первый!</p>';
            return;
        }

        clubsGrid.innerHTML = '';
        snapshot.forEach(doc => {
            const club = { id: doc.id, ...doc.data() };
            const clubCard = createClubCard(club);
            clubsGrid.appendChild(clubCard);
        });
    } catch (error) {
        console.error('Ошибка загрузки клубов:', error);
        showNotification('Ошибка загрузки клубов', 'error');
    }
}

async function loadMyClubs() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('clubs')
            .where('members', 'array-contains', currentUser.id)
            .orderBy('createdAt', 'desc')
            .get();

        const myClubsList = document.getElementById('myClubsList');
        
        if (snapshot.empty) {
            myClubsList.innerHTML = '<p class="empty">Вы не состоите в клубах</p>';
            return;
        }

        myClubsList.innerHTML = '';
        snapshot.forEach(doc => {
            const club = { id: doc.id, ...doc.data() };
            const clubItem = createClubListItem(club);
            myClubsList.appendChild(clubItem);
        });
    } catch (error) {
        console.error('Ошибка загрузки моих клубов:', error);
        showNotification('Ошибка загрузки моих клубов', 'error');
    }
}

function createClubCard(club) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const isMember = club.members && club.members.includes(currentUser?.id);
    const membersCount = club.members ? club.members.length : 0;
    
    card.innerHTML = `
        <div style="position: relative; z-index: 1;">
            <h4>${club.name}</h4>
            <p class="book-meta"><strong>Жанр:</strong> ${club.genre}</p>
            <p class="book-meta"><strong>Создатель:</strong> ${club.creatorName}</p>
            <p class="book-meta"><strong>Участников:</strong> ${membersCount}</p>
            <div class="review">${club.description}</div>
            <div style="margin-top: 15px;">
                ${!isMember ? 
                    `<button class="btn btn-primary btn-small join-club" data-club-id="${club.id}" style="width: 100%;">
                        <i class="fas fa-sign-in-alt"></i> Вступить
                    </button>` : 
                    `<button class="btn btn-outline btn-small leave-club" data-club-id="${club.id}" style="width: 100%;">
                        <i class="fas fa-sign-out-alt"></i> Выйти
                    </button>`
                }
            </div>
        </div>
    `;
    
    return card;
}

function createClubListItem(club) {
    const item = document.createElement('div');
    item.className = 'friend-item';
    
    item.innerHTML = `
        <div class="friend-info">
            <div class="user-avatar">
                <i class="fas fa-users"></i>
            </div>
            <div>
                <h4>${club.name}</h4>
                <p class="friend-meta"><i class="fas fa-book"></i> ${club.genre}</p>
                <p class="friend-meta"><i class="fas fa-user"></i> ${club.creatorName}</p>
            </div>
        </div>
        <button class="btn btn-outline btn-small leave-club" data-club-id="${club.id}" style="width: 100%; margin-top: 10px;">
            <i class="fas fa-sign-out-alt"></i> Выйти из клуба
        </button>
    `;
    
    return item;
}

// ==============================================
// ДРУЗЬЯ
// ==============================================
function setupFriends() {
    document.getElementById('searchFriendBtn').addEventListener('click', searchFriends);
    document.getElementById('friendSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchFriends();
        }
    });
}

async function loadAllUsers() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('users').get();
        allUsers = [];
        
        snapshot.forEach(doc => {
            if (doc.id !== currentUser.id) {
                allUsers.push({ id: doc.id, ...doc.data() });
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

async function loadFriends() {
    if (!currentUser) return;

    try {
        // Загружаем связи друзей
        const snapshot = await db.collection('friendships')
            .where('users', 'array-contains', currentUser.id)
            .get();

        friends = [];
        const friendIds = new Set();

        snapshot.forEach(doc => {
            const friendship = doc.data();
            const friendId = friendship.users.find(id => id !== currentUser.id);
            if (friendId && friendship.status === 'accepted') {
                friendIds.add(friendId);
            }
        });

        // Загружаем информацию о друзьях
        for (const friendId of friendIds) {
            const userDoc = await db.collection('users').doc(friendId).get();
            if (userDoc.exists) {
                friends.push({ id: friendId, ...userDoc.data() });
            }
        }

        displayFriends();
    } catch (error) {
        console.error('Ошибка загрузки друзей:', error);
        showNotification('Ошибка загрузки друзей', 'error');
    }
}

async function loadFriendRequests() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('friendships')
            .where('receiverId', '==', currentUser.id)
            .where('status', '==', 'pending')
            .get();

        friendRequests = [];
        snapshot.forEach(doc => {
            friendRequests.push({ id: doc.id, ...doc.data() });
        });

        displayFriendRequests();
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        showNotification('Ошибка загрузки заявок', 'error');
    }
}

async function searchFriends() {
    const searchInput = document.getElementById('friendSearch').value.trim();
    const searchResults = document.getElementById('searchResults');

    if (!searchInput) {
        searchResults.innerHTML = '<p class="empty">Введите никнейм для поиска</p>';
        return;
    }

    try {
        const snapshot = await db.collection('users')
            .where('username', '>=', searchInput)
            .where('username', '<=', searchInput + '\uf8ff')
            .limit(10)
            .get();

        if (snapshot.empty) {
            searchResults.innerHTML = '<p class="empty">Пользователь не найден</p>';
            return;
        }

        searchResults.innerHTML = '';
        snapshot.forEach(doc => {
            if (doc.id === currentUser.id) return;

            const user = { id: doc.id, ...doc.data() };
            const isFriend = friends.some(f => f.id === user.id);
            const hasPendingRequest = friendRequests.some(r => r.senderId === user.id);

            const userCard = createUserSearchCard(user, isFriend, hasPendingRequest);
            searchResults.appendChild(userCard);
        });
    } catch (error) {
        console.error('Ошибка поиска:', error);
        showNotification('Ошибка поиска', 'error');
    }
}

function createUserSearchCard(user, isFriend, hasPendingRequest) {
    const card = document.createElement('div');
    card.className = 'friend-item';
    
    card.innerHTML = `
        <div class="friend-info">
            <div class="user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div>
                <h4>${user.username}</h4>
                <p class="friend-meta"><i class="fas fa-calendar"></i> Зарегистрирован</p>
            </div>
        </div>
        <div class="friend-actions">
            ${!isFriend && !hasPendingRequest ? 
                `<button class="btn btn-primary btn-small add-friend" data-user-id="${user.id}">
                    <i class="fas fa-user-plus"></i> Добавить в друзья
                </button>` : 
                ''
            }
            ${hasPendingRequest ? 
                `<button class="btn btn-outline btn-small cancel-request" data-user-id="${user.id}" disabled>
                    <i class="fas fa-clock"></i> Запрос отправлен
                </button>` : 
                ''
            }
            ${isFriend ? 
                `<button class="btn btn-outline btn-small remove-friend" data-user-id="${user.id}">
                    <i class="fas fa-user-minus"></i> Удалить из друзей
                </button>` : 
                ''
            }
        </div>
    `;
    
    return card;
}

function displayFriends() {
    const friendsList = document.getElementById('friendsList');
    const friendsCount = document.getElementById('friendsCount');
    
    friendsCount.textContent = friends.length;
    
    if (friends.length === 0) {
        friendsList.innerHTML = '<p class="empty">Пока нет друзей</p>';
        return;
    }
    
    friendsList.innerHTML = '';
    friends.forEach(friend => {
        const friendCard = createFriendCard(friend);
        friendsList.appendChild(friendCard);
    });
}

function createFriendCard(friend) {
    const card = document.createElement('div');
    card.className = 'friend-item';
    
    // В реальном приложении здесь нужно загружать статистику друга
    const booksCount = Math.floor(Math.random() * 50) + 1;
    const clubsCount = Math.floor(Math.random() * 5);
    
    card.innerHTML = `
        <div class="friend-info">
            <div class="user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div>
                <h4>${friend.username}</h4>
                <p class="friend-meta"><i class="fas fa-book"></i> ${booksCount} книг</p>
                <p class="friend-meta"><i class="fas fa-users"></i> ${clubsCount} клубов</p>
            </div>
        </div>
        <div class="friend-stats">
            <div class="stat-item">
                <div class="stat-value">${booksCount}</div>
                <div class="stat-label">Книг</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${clubsCount}</div>
                <div class="stat-label">Клубов</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${Math.floor(Math.random() * 100)}</div>
                <div class="stat-label">Дней</div>
            </div>
        </div>
        <div class="friend-actions">
            <button class="btn btn-primary btn-small view-books" data-user-id="${friend.id}">
                <i class="fas fa-book-open"></i> Книги
            </button>
            <button class="btn btn-outline btn-small remove-friend" data-user-id="${friend.id}">
                <i class="fas fa-user-minus"></i> Удалить
            </button>
        </div>
    `;
    
    return card;
}

function displayFriendRequests() {
    const requestsList = document.getElementById('requestsList');
    const requestsCount = document.getElementById('requestsCount');
    
    requestsCount.textContent = friendRequests.length;
    
    if (friendRequests.length === 0) {
        requestsList.innerHTML = '<p class="empty">Нет заявок в друзья</p>';
        return;
    }
    
    requestsList.innerHTML = '';
    friendRequests.forEach(request => {
        const requestCard = createRequestCard(request);
        requestsList.appendChild(requestCard);
    });
}

async function createRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'friend-item';
    
    // Получаем информацию об отправителе
    let senderName = 'Пользователь';
    try {
        const senderDoc = await db.collection('users').doc(request.senderId).get();
        if (senderDoc.exists) {
            senderName = senderDoc.data().username;
        }
    } catch (error) {
        console.error('Ошибка загрузки информации об отправителе:', error);
    }
    
    card.innerHTML = `
        <div class="friend-info">
            <div class="user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div>
                <h4>${senderName}</h4>
                <p class="friend-meta"><i class="fas fa-clock"></i> Отправлено</p>
            </div>
        </div>
        <div class="friend-actions">
            <button class="btn btn-primary btn-small accept-request" data-request-id="${request.id}" data-user-id="${request.senderId}">
                <i class="fas fa-check"></i> Принять
            </button>
            <button class="btn btn-outline btn-small reject-request" data-request-id="${request.id}">
                <i class="fas fa-times"></i> Отклонить
            </button>
        </div>
    `;
    
    return card;
}

// ==============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ==============================================
function setupEventListeners() {
    // Навигация
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            switchPage(page);
        });
    });

    // Выход
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Обработчики для динамически созданных элементов
    document.addEventListener('click', async (e) => {
        // Вступление в клуб
        if (e.target.closest('.join-club')) {
            const clubId = e.target.closest('.join-club').dataset.clubId;
            await joinClub(clubId);
        }
        
        // Выход из клуба
        if (e.target.closest('.leave-club')) {
            const clubId = e.target.closest('.leave-club').dataset.clubId;
            await leaveClub(clubId);
        }
        
        // Добавление в друзья
        if (e.target.closest('.add-friend')) {
            const userId = e.target.closest('.add-friend').dataset.userId;
            await sendFriendRequest(userId);
        }
        
        // Удаление из друзей
        if (e.target.closest('.remove-friend')) {
            const userId = e.target.closest('.remove-friend').dataset.userId;
            await removeFriend(userId);
        }
        
        // Принятие заявки в друзья
        if (e.target.closest('.accept-request')) {
            const requestId = e.target.closest('.accept-request').dataset.requestId;
            const userId = e.target.closest('.accept-request').dataset.userId;
            await acceptFriendRequest(requestId, userId);
        }
        
        // Отклонение заявки в друзья
        if (e.target.closest('.reject-request')) {
            const requestId = e.target.closest('.reject-request').dataset.requestId;
            await rejectFriendRequest(requestId);
        }
        
        // Просмотр книг друга
        if (e.target.closest('.view-books')) {
            const userId = e.target.closest('.view-books').dataset.userId;
            await viewUserBooks(userId);
        }
    });
}

async function joinClub(clubId) {
    if (!currentUser) return;

    try {
        const clubRef = db.collection('clubs').doc(clubId);
        await clubRef.update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.id),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Вы вступили в клуб!', 'success');
        loadClubs();
        loadMyClubs();
    } catch (error) {
        console.error('Ошибка вступления в клуб:', error);
        showNotification('Ошибка вступления в клуб', 'error');
    }
}

async function leaveClub(clubId) {
    if (!currentUser) return;

    try {
        const clubRef = db.collection('clubs').doc(clubId);
        await clubRef.update({
            members: firebase.firestore.FieldValue.arrayRemove(currentUser.id),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Вы вышли из клуба', 'info');
        loadClubs();
        loadMyClubs();
    } catch (error) {
        console.error('Ошибка выхода из клуба:', error);
        showNotification('Ошибка выхода из клуба', 'error');
    }
}

async function sendFriendRequest(receiverId) {
    if (!currentUser) return;

    try {
        // Проверяем, есть ли уже запрос
        const existingRequest = await db.collection('friendships')
            .where('senderId', '==', currentUser.id)
            .where('receiverId', '==', receiverId)
            .where('status', '==', 'pending')
            .get();

        if (!existingRequest.empty) {
            showNotification('Запрос уже отправлен', 'info');
            return;
        }

        // Проверяем, уже ли друзья
        const existingFriendship = await db.collection('friendships')
            .where('users', 'array-contains', currentUser.id)
            .where('users', 'array-contains', receiverId)
            .where('status', '==', 'accepted')
            .get();

        if (!existingFriendship.empty) {
            showNotification('Вы уже друзья', 'info');
            return;
        }

        // Создаем запрос
        const requestData = {
            senderId: currentUser.id,
            receiverId: receiverId,
            users: [currentUser.id, receiverId],
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('friendships').add(requestData);
        
        showNotification('Запрос в друзья отправлен', 'success');
        loadFriends();
        searchFriends();
    } catch (error) {
        console.error('Ошибка отправки запроса:', error);
        showNotification('Ошибка отправки запроса', 'error');
    }
}

async function acceptFriendRequest(requestId, friendId) {
    try {
        const requestRef = db.collection('friendships').doc(requestId);
        await requestRef.update({
            status: 'accepted',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Запрос принят!', 'success');
        loadFriends();
        loadFriendRequests();
        searchFriends();
    } catch (error) {
        console.error('Ошибка принятия запроса:', error);
        showNotification('Ошибка принятия запроса', 'error');
    }
}

async function rejectFriendRequest(requestId) {
    try {
        await db.collection('friendships').doc(requestId).delete();
        
        showNotification('Запрос отклонен', 'info');
        loadFriendRequests();
    } catch (error) {
        console.error('Ошибка отклонения запроса:', error);
        showNotification('Ошибка отклонения запроса', 'error');
    }
}

async function removeFriend(friendId) {
    if (!currentUser) return;

    try {
        // Находим дружбу
        const snapshot = await db.collection('friendships')
            .where('users', 'array-contains', currentUser.id)
            .where('users', 'array-contains', friendId)
            .where('status', '==', 'accepted')
            .get();

        if (!snapshot.empty) {
            const friendshipId = snapshot.docs[0].id;
            await db.collection('friendships').doc(friendshipId).delete();
            
            showNotification('Друг удален', 'info');
            loadFriends();
            searchFriends();
        }
    } catch (error) {
        console.error('Ошибка удаления друга:', error);
        showNotification('Ошибка удаления друга', 'error');
    }
}

async function viewUserBooks(userId) {
    try {
        const snapshot = await db.collection('books')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            showNotification('У пользователя пока нет книг', 'info');
            return;
        }

        const books = [];
        snapshot.forEach(doc => {
            books.push({ id: doc.id, ...doc.data() });
        });

        // Получаем имя пользователя
        const userDoc = await db.collection('users').doc(userId).get();
        const username = userDoc.exists ? userDoc.data().username : 'Пользователь';

        // Создаем модальное окно с книгами
        showUserBooksModal(username, books);
    } catch (error) {
        console.error('Ошибка загрузки книг пользователя:', error);
        showNotification('Ошибка загрузки книг', 'error');
    }
}

function showUserBooksModal(username, books) {
    // Удаляем старое модальное окно если есть
    const oldModal = document.getElementById('userBooksModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'userBooksModal';
    modal.className = 'modal';
    modal.style.display = 'flex';

    let booksHTML = '';
    if (books.length > 0) {
        booksHTML = '<div class="user-books-grid">';
        books.forEach(book => {
            const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
            booksHTML += `
                <div class="book-card">
                    <h4>${book.title}</h4>
                    <p class="book-meta"><strong>Автор:</strong> ${book.author}</p>
                    <p class="book-meta"><strong>Жанр:</strong> ${book.genre}</p>
                    ${book.rating > 0 ? `<p class="book-meta"><strong>Оценка:</strong> ${stars}</p>` : ''}
                </div>
            `;
        });
        booksHTML += '</div>';
    } else {
        booksHTML = '<p class="empty">Нет книг</p>';
    }

    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-user-books" style="position: absolute; top: 16px; right: 16px; font-size: 20px; cursor: pointer; color: var(--primary);">&times;</span>
            <h2><i class="fas fa-book"></i> Книги ${username}</h2>
            <p>${books.length} книг на полке</p>
            ${booksHTML}
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Закрытие модального окна
    modal.querySelector('.close-user-books').addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    });
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ==============================================
async function initApp() {
    console.log('🚀 Инициализация BookShelf...');
    
    try {
        // Проверяем доступность Firebase
        if (!firebase.apps.length) {
            console.error('❌ Firebase не инициализирован');
            showNotification('Ошибка подключения к базе данных', 'error');
            return;
        }
        
        // Настройка мобильного меню
        setupMobileMenu();
        
        // Настройка аутентификации
        setupAuthModal();
        
        // Настройка функционала книжной полки
        setupBookShelf();
        
        // Настройка клубов
        setupClubs();
        
        // Настройка друзей
        setupFriends();
        
        // Общие обработчики событий
        setupEventListeners();
        
        // Пробуем автоматический вход
        const autoLoggedIn = await autoLogin();
        
        if (!autoLoggedIn) {
            switchPage('home');
        }
        
        console.log('✅ Приложение успешно инициализировано');
        
        // Показываем приветственное сообщение
        setTimeout(() => {
            if (!autoLoggedIn) {
                showNotification('Добро пожаловать в BookShelf! Для начала работы войдите или зарегистрируйтесь.', 'info');
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
}

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);

// Обработка ошибок Firebase
firebase.firestore().enablePersistence()
    .catch((err) => {
        console.warn('⚠️ Оффлайн режим недоступен:', err.code);
    });
