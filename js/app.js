function App() {
  const [loading, setLoading] = React.useState(true);
  const [games, setGames] = React.useState([]);
  const [keysDB, setKeysDB] = React.useState({});
  const [usersDB, setUsersDB] = React.useState({});
  const [quizQuestions, setQuizQuestions] = React.useState([]);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [activeView, setActiveView] = React.useState('games');
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [showGameDetails, setShowGameDetails] = React.useState(null);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const localUsers = localStorage.getItem('gamestore_users');
        const localKeys = localStorage.getItem('gamestore_keys');

        const [gamesData, quizData, initialKeys, initialUsers] = await Promise.all([
          fetch('data/games.json').then(res => res.json()),
          fetch('data/quiz.json').then(res => res.json()),
          localKeys ? Promise.resolve(JSON.parse(localKeys)) : fetch('data/keys.json').then(res => res.json()),
          localUsers ? Promise.resolve(JSON.parse(localUsers)) : fetch('data/users.json').then(res => res.json())
        ]);

        setGames(gamesData);
        setQuizQuestions(quizData);
        setKeysDB(initialKeys);
        setUsersDB(initialUsers);
        if (!localKeys) {
          localStorage.setItem('gamestore_keys', JSON.stringify(initialKeys));
        }
        if (!localUsers) {
          localStorage.setItem('gamestore_users', JSON.stringify(initialUsers));
        }
      } catch (error) {
        console.error("Помилка завантаження даних:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  const saveUsersDB = (updatedUsers) => {
    localStorage.setItem('gamestore_users', JSON.stringify(updatedUsers));
    setUsersDB(updatedUsers);
  };

  const saveKeysDB = (updatedKeys) => {
    localStorage.setItem('gamestore_keys', JSON.stringify(updatedKeys));
    setKeysDB(updatedKeys);
  };
  const handleLogin = (user) => {
    setCurrentUser(user);
  };
  const handleLogout = () => {
    setCurrentUser(null);
  };
  const handlePurchase = (updatedUser, purchasedKey) => {
    setCurrentUser({...updatedUser});
    const newUsersDB = {...usersDB, [updatedUser.email]: updatedUser};
    saveUsersDB(newUsersDB);
  };

  const handleBalanceUpdate = (updatedUser) => {
    setCurrentUser({...updatedUser});
    const newUsersDB = {...usersDB, [updatedUser.email]: updatedUser};
    saveUsersDB(newUsersDB);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Завантаження...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Навігація */}
      <nav className="navbar navbar-expand-lg navbar-light sticky-top">
        <div className="container">
          <a className="navbar-brand fw-bold" href="#" onClick={() => setActiveView('games')}>
            <i className="fas fa-gamepad me-2 text-primary"></i>GameKeys Store
          </a>
          <div className="d-flex align-items-center">
            {currentUser && (
              <span className="me-3 balance-display">{currentUser.balance} ₴</span>
            )}
            <button className="btn btn-outline-secondary me-2" onClick={() => setActiveView('quiz')}>
              <i className="fas fa-question-circle me-1"></i> Вікторина
            </button>
            {currentUser ? (
              <>
                <button className="btn btn-outline-secondary me-2" onClick={() => setShowProfileModal(true)}>
                  <i className="fas fa-user me-1"></i> {currentUser.name}
                </button>
                <button className="btn btn-outline-danger" onClick={handleLogout}>Вийти</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowLoginModal(true)}>
                Увійти / Реєстрація
              </button>
            )}
          </div>
        </div>
      </nav>
      <div className="container mt-4">
        {activeView === 'games' && (
          <div className="row g-4">
            {games.map(game => (
              <div key={game.id} className="col-lg-3 col-md-4 col-sm-6 animate-fade-in">
                <div className="card h-100 game-card">
                  <img src={game.image} className="card-img-top" alt={game.title} />
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{game.title}</h5>
                    {game.discount > 0 && <span className="badge bg-danger align-self-start">-{game.discount}%</span>}
                    <p className="card-text mt-2"><span className="badge bg-secondary">{game.platform}</span></p>
                    <div className="mt-auto d-flex justify-content-between align-items-center">
                      <span className="fw-bold fs-5 text-primary">{Math.round(game.price * (1 - game.discount / 100))} ₴</span>
                      <button className="btn btn-primary" onClick={() => setShowGameDetails(game)}>
                        Деталі
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'quiz' && (
          <GameQuiz user={currentUser} onBalanceUpdate={handleBalanceUpdate} quizQuestions={quizQuestions} usersDB={usersDB} saveUsersDB={saveUsersDB} />
        )}
      </div>

      {/* Модальні вікна */}
      <LoginModal
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        usersDB={usersDB}
        saveUsersDB={saveUsersDB}
      />

      <GameDetailsModal
        game={showGameDetails}
        show={!!showGameDetails}
        onClose={() => setShowGameDetails(null)}
        user={currentUser}
        onPurchase={handlePurchase}
        keysDB={keysDB}
        saveKeysDB={saveKeysDB}
        usersDB={usersDB}
        saveUsersDB={saveUsersDB}
      />

      <ProfileModal
        user={currentUser}
        show={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
function LoginModal({ show, onClose, onLogin, usersDB, saveUsersDB }) {
  const [formData, setFormData] = React.useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [errors, setErrors] = React.useState({});
  const [isLogin, setIsLogin] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Невірний формат email';
    if (!formData.password.trim() || formData.password.length < 6) newErrors.password = 'Пароль має бути не менше 6 символів';
    if (!isLogin) {
      if (!formData.name.trim()) newErrors.name = "Ім'я обов'язкове";
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Паролі не співпадають';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (isLogin) {
      const user = usersDB[formData.email];
      if (user && user.password === formData.password) {
        onLogin(user);
        onClose();
      } else {
        setErrors({ general: 'Невірний email або пароль' });
      }
    } else {
      if (usersDB[formData.email]) {
        setErrors({ email: 'Користувач з таким email вже існує' });
      } else {
        const newUser = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          balance: 1000,
          registrationDate: new Date().toISOString(),
          purchasedGames: [],
          totalSpent: 0
        };
        const updatedUsers = { ...usersDB, [formData.email]: newUser };
        saveUsersDB(updatedUsers);
        onLogin(newUser);
        onClose();
      }
    }
    setIsLoading(false);
  };
  if (!show) return null;
  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{isLogin ? 'Вхід' : 'Реєстрація'}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              {errors.general && <div className="alert alert-danger">{errors.general}</div>}
              {!isLogin && (
                <div className="mb-3">
                  <label className="form-label">Ім'я</label>
                  <input type="text" className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label">Пароль</label>
                <input type="password" className={`form-control ${errors.password ? 'is-invalid' : ''}`} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
              </div>
              {!isLogin && (
                <div className="mb-3">
                  <label className="form-label">Повторіть пароль</label>
                  <input type="password" className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
                  {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                </div>
              )}
              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? <span className="spinner-border spinner-border-sm"></span> : (isLogin ? 'Увійти' : 'Зареєструватися')}
                </button>
                <button type="button" className="btn btn-link" onClick={() => { setIsLogin(!isLogin); setErrors({}); }}>
                  {isLogin ? 'Немає акаунту? Зареєструватися' : 'Уже є акаунт? Увійти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
function GameDetailsModal({ game, show, onClose, user, onPurchase, keysDB, saveKeysDB, usersDB, saveUsersDB }) {
  const [purchaseStatus, setPurchaseStatus] = React.useState(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  React.useEffect(() => {
    setPurchaseStatus(null);
  }, [game]);
  if (!show || !game) return null;
  const finalPrice = Math.round(game.price * (1 - game.discount / 100));
  const availableKeys = keysDB[game.id.toString()] || [];
  const handlePurchase = async () => {
    if (!user) { alert('Будь ласка, увійдіть в акаунт для покупки'); return; }
    if (user.balance < finalPrice) { setPurchaseStatus('insufficient'); return; }
    if (availableKeys.length === 0) { setPurchaseStatus('no_keys'); return; }
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const purchasedKey = availableKeys.shift();
    const updatedKeys = { ...keysDB, [game.id.toString()]: availableKeys };
    saveKeysDB(updatedKeys);
    const updatedUser = {
      ...user,
      balance: user.balance - finalPrice,
      totalSpent: user.totalSpent + finalPrice,
      purchasedGames: [...user.purchasedGames, {
        gameId: game.id,
        gameTitle: game.title,
        key: purchasedKey,
        price: finalPrice,
        purchaseDate: new Date().toISOString()
      }]
    };
    const updatedUsers = { ...usersDB, [user.email]: updatedUser };
    saveUsersDB(updatedUsers);
    setPurchaseStatus('success');
    onPurchase(updatedUser, purchasedKey);
    setIsProcessing(false);
  };
  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{game.title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {purchaseStatus === 'success' && <div className="purchase-success"><h6 className="text-success"><i className="fas fa-check-circle me-2"></i>Покупка успішна!</h6><p>Ваш ключ додано до особистого кабінету.</p></div>}
            {purchaseStatus === 'insufficient' && <div className="insufficient-funds"><h6 className="text-danger"><i className="fas fa-exclamation-triangle me-2"></i>Недостатньо коштів</h6></div>}
            {purchaseStatus === 'no_keys' && <div className="insufficient-funds"><h6 className="text-danger"><i className="fas fa-exclamation-triangle me-2"></i>Ключі закінчились</h6></div>}
            <div className="row">
              <div className="col-md-6">
                <img src={game.image} alt={game.title} className="img-fluid rounded" />
              </div>
              <div className="col-md-6">
                <p><strong>Платформа:</strong> {game.platform}</p>
                <p><strong>Жанр:</strong> {game.genre}</p>
                <p><strong>Ключів залишилось:</strong> <span className="badge bg-info">{availableKeys.length}</span></p>
                <div className="mb-3">
                  {game.discount > 0 && (
                    <>
                      <span className="badge bg-danger me-2">-{game.discount}%</span>
                      <span className="text-decoration-line-through text-muted me-2">{game.price} ₴</span>
                    </>
                  )}
                  <h4 className="text-primary d-inline-block">{finalPrice} ₴</h4>
                </div>
                <p>{game.description}</p>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            {user && <div className="me-auto"><small className="text-muted">Ваш баланс: </small><span className="balance-display">{user.balance} ₴</span></div>}
            <button className="btn btn-primary" disabled={availableKeys.length === 0 || !user || isProcessing} onClick={handlePurchase}>
              {isProcessing ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-shopping-cart me-2"></i>}
              Купити ключ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function ProfileModal({ user, show, onClose }) {
  if (!show || !user) return null;
  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Особистий кабінет</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row mb-4">
              <div className="col-md-6">
                <h6>Інформація про акаунт</h6>
                <p><strong>Ім'я:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Дата реєстрації:</strong> {new Date(user.registrationDate).toLocaleDateString('uk-UA')}</p>
              </div>
              <div className="col-md-6">
                <h6>Статистика</h6>
                <p><strong>Поточний баланс:</strong> <span className="balance-display">{user.balance} ₴</span></p>
                <p><strong>Всього витрачено:</strong> {user.totalSpent} ₴</p>
                <p><strong>Куплено ігор:</strong> {user.purchasedGames.length}</p>
              </div>
            </div>
            <h6>Куплені ігри та ключі</h6>
            {user.purchasedGames.length === 0 ? (
              <p className="text-muted">Ви ще не купували жодної гри.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                  <tr><th>Гра</th><th>Ключ</th><th>Ціна</th><th>Дата</th></tr>
                  </thead>
                  <tbody>
                  {user.purchasedGames.map((p, i) => (
                    <tr key={i}>
                      <td>{p.gameTitle}</td>
                      <td><code className="bg-light p-1 rounded">{p.key}</code></td>
                      <td>{p.price} ₴</td>
                      <td>{new Date(p.purchaseDate).toLocaleDateString('uk-UA')}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function GameQuiz({ user, onBalanceUpdate, quizQuestions, usersDB, saveUsersDB }) {
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [showResult, setShowResult] = React.useState(false);
  const [selectedAnswer, setSelectedAnswer] = React.useState('');
  const [earnedMoney, setEarnedMoney] = React.useState(0);
  const handleAnswer = () => {
    if (!selectedAnswer) return;
    if (selectedAnswer === quizQuestions[currentQuestion].correct) {
      setScore(score + 1);
      const reward = 50;
      setEarnedMoney(earnedMoney + reward);
      if (user) {
        const updatedUser = { ...user, balance: user.balance + reward };
        onBalanceUpdate(updatedUser);
      }
    }
    setSelectedAnswer('');
    if (currentQuestion + 1 < quizQuestions.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };
  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setSelectedAnswer('');
    setEarnedMoney(0);
  };
  if (!quizQuestions || quizQuestions.length === 0) {
    return <div className="quiz-container">Питання для вікторини завантажуються...</div>;
  }
  if (showResult) {
    return (
      <div className="quiz-container animate-fade-in text-center">
        <h4>Результат вікторини</h4>
        <p>Ви відповіли правильно на {score} з {quizQuestions.length} питань!</p>
        {earnedMoney > 0 && <div className="alert alert-success">Ви заробили: <strong>{earnedMoney} ₴</strong></div>}
        <button className="btn btn-primary" onClick={resetQuiz}>Пройти знову</button>
      </div>
    );
  }
  return (
    <div className="quiz-container animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Вікторина про ігри</h4>
        {user && <span className="badge bg-success"><i className="fas fa-coins me-1"></i>+50₴ за правильну відповідь</span>}
      </div>
      <div className="mb-3">
        <small className="text-muted">Питання {currentQuestion + 1} з {quizQuestions.length}</small>
      </div>
      <h5>{quizQuestions[currentQuestion].question}</h5>
      <div className="mt-3">
        {quizQuestions[currentQuestion].options.map((option, index) => (
          <div key={index} className="form-check">
            <input className="form-check-input" type="radio" name="answer" id={`option${index}`} value={option} checked={selectedAnswer === option} onChange={(e) => setSelectedAnswer(e.target.value)} />
            <label className="form-check-label" htmlFor={`option${index}`}>{option}</label>
          </div>
        ))}
      </div>
      <button className="btn btn-primary mt-3" onClick={handleAnswer} disabled={!selectedAnswer}>
        Відповісти
      </button>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);