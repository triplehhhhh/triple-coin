window.onerror = function(msg, url, line) {
    if(msg.includes('module')) return;
    alert("Sistem Xətası (Şəkilini çək mənə at): " + msg + " Sətr: " + line);
};

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6el2tDrjg4wnMNcRKTW3cDc0LTFqReIQ",
  authDomain: "tirplcoin.firebaseapp.com",
  projectId: "tirplcoin",
  storageBucket: "tirplcoin.firebasestorage.app",
  messagingSenderId: "687975359296",
  appId: "1:687975359296:web:1572e0c31fe8c5549c10a5"
};

// Initialize Firebase using Global Compat Object
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// --- STATE MANAGEMENT --- //
let currentUserData = null;

// --- GOOGLE SIGN-IN --- //
document.getElementById('google-login-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('google-login-status');
    const errorEl = document.getElementById('google-login-error');
    errorEl.textContent = '';
    statusEl.style.display = 'block';

    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;

        // Check if user doc exists in Firestore
        const docRef = db.collection('users').doc(user.uid);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            // First time — create user document
            await docRef.set({
                id: Math.floor(1000 + Math.random() * 9000),
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                coins: 0,
                diamonds: 0,
                redeemedCodes: []
            });
        }

        showToast('Google ilə daxil oldunuz!');
    } catch (error) {
        console.error('Google sign-in error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            errorEl.textContent = 'Giriş pəncərəsi bağlandı.';
        } else if (error.code === 'auth/cancelled-popup-request') {
            // ignore
        } else {
            errorEl.textContent = 'Xəta: ' + error.message;
        }
    } finally {
        statusEl.style.display = 'none';
    }
});

// Demo redeem codes 
const validRedeemCodes = {
    'TRIPL2024': 500,
    'WELCOME100': 100,
    'BOSS5000': 5000,
    'TRIPLVIP': 9000,
    'SILSN858': 1000
};

// --- DOM ELEMENTS --- //
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginStatus = document.getElementById('login-status');
const regStatus = document.getElementById('reg-status');

const convertCoinInput = document.getElementById('convert-coin-input');
const convertDiamondOutput = document.getElementById('convert-diamond-output');
const convertBtn = document.getElementById('convert-btn');

const orderModal = document.getElementById('order-modal');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
const playerUidInput = document.getElementById('player-uid');

let pendingOrder = null;

// --- UI Navigation --- //
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function switchTab(tab) {
    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        document.getElementById('login-error').textContent = '';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        document.getElementById('reg-error').textContent = '';
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    if (isError) {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function setLoginLoading(isLoading) {
    loginBtn.disabled = isLoading;
    loginStatus.style.display = isLoading ? 'block' : 'none';
}

function setRegLoading(isLoading) {
    registerBtn.disabled = isLoading;
    regStatus.style.display = isLoading ? 'block' : 'none';
}

// Generate Random ID for users
function generateID() {
    return Math.floor(1000 + Math.random() * 9000);
}

// --- FIREBASE AUTHENTICATION --- //

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';
    
    setLoginLoading(true);

    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast("Sistemə daxil oldunuz!");
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password') {
            errorEl.textContent = "E-mail və ya şifrə səhvdir.";
        } else {
            errorEl.textContent = "Xəta: " + error.message;
        }
    } finally {
        setLoginLoading(false);
    }
});

// Handle Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('reg-error');
    errorEl.textContent = '';
    
    setRegLoading(true);

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        const newUserData = {
            id: generateID(),
            email: email,
            coins: 0,
            diamonds: 0,
            redeemedCodes: []
        };
        
        await db.collection("users").doc(user.uid).set(newUserData);
        showToast("Qeydiyyat uğurludur!");
        
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            errorEl.textContent = "Bu email artıq qeydiyyatdan keçib! 'Giriş' bölməsinə qayıdın.";
        } else if (error.code === 'auth/weak-password') {
            errorEl.textContent = "Şifrə ən azı 6 simvol olmalıdır.";
        } else {
            errorEl.textContent = "Xəta baş verdi: " + error.message;
            if(error.message.includes('authDomain')) {
                alert("Diqqət: Firebase Təhlükəsizliyi lokal kompüterdən (file:///) qeydiyyata icazə vermir! Saytı Netlify-yə yükləyin!");
            }
        }
    } finally {
        setRegLoading(false);
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        switchView('auth-view');
        loginForm.reset();
        registerForm.reset();
    });
});

// Listener for Auth State changes
auth.onAuthStateChanged(async (user) => {
    if (user) {
        await fetchUserData(user.uid);
        loadUserHistory(user.uid);
        switchView('dashboard-view');
    } else {
        currentUserData = null;
        switchView('auth-view');
    }
});

// --- FIRESTORE DATA --- //

async function fetchUserData(uid) {
    try {
        const docRef = db.collection("users").doc(uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            currentUserData = docSnap.data();
            updateUIWithUserData();
        } else {
            console.error("No such user document!");
        }
    } catch (e) {
        console.error("Error fetching user data:", e);
    }
}

function updateUIWithUserData() {
    if (!currentUserData) return;
    document.getElementById('user-id-display').textContent = `ID: #${currentUserData.id}`;
    document.getElementById('coin-balance').textContent = currentUserData.coins;
    document.getElementById('diamond-balance').textContent = currentUserData.diamonds;
    document.getElementById('shop-coin-balance').textContent = currentUserData.coins;
}

// Helper to update specific fields in Firestore
async function updateUserData(fieldsToUpdate) {
    if (!auth.currentUser) return;
    try {
        const userRef = db.collection("users").doc(auth.currentUser.uid);
        await userRef.update(fieldsToUpdate);
        
        currentUserData = { ...currentUserData, ...fieldsToUpdate };
        updateUIWithUserData();
    } catch (e) {
        console.error("Error updating document: ", e);
        showToast("Məlumatlar yenilənərkən xəta oldu!", true);
    }
}

// --- REDEEM SYSTEM --- //

document.getElementById('redeem-btn').addEventListener('click', async () => {
    if (!currentUserData) {
        showToast("Xəta: İstifadəçi məlumatları (Baza) tapılmadı!", true);
        return;
    }

    const codeInput = document.getElementById('redeem-code-input');
    const messageEl = document.getElementById('redeem-message');
    const code = codeInput.value.trim().toUpperCase();
    
    // Reset message
    messageEl.className = '';
    messageEl.textContent = '';
    if (!code) return;

    if (!validRedeemCodes[code]) {
        messageEl.textContent = "❌ Kod etibarsızdır!";
        messageEl.classList.add('error-text');
        return;
    }

    if (currentUserData.redeemedCodes && currentUserData.redeemedCodes.includes(code)) {
        messageEl.textContent = "⚠️ Siz bu kodu artıq istifadə etmisiniz.";
        messageEl.classList.add('error-text');
        return;
    }

    const reward = validRedeemCodes[code];
    const newCoins = currentUserData.coins + reward;
    const newRedeemedCodes = [...(currentUserData.redeemedCodes || []), code];

    messageEl.textContent = "Gözləyin...";
    
    await updateUserData({
        coins: newCoins,
        redeemedCodes: newRedeemedCodes
    });
    
    codeInput.value = '';
    messageEl.textContent = `✅ Təbriklər! ${reward} Coin qazandınız!`;
    messageEl.classList.add('success');
    showToast("Kod uğurla istifadə edildi");
    
    setTimeout(() => {
        messageEl.textContent = '';
    }, 3000);
});

// --- CONVERTER SYSTEM --- //

convertCoinInput.addEventListener('input', (e) => {
    let coins = parseInt(e.target.value);
    if (!coins || coins < 10) {
        convertDiamondOutput.value = "= 0 Elmas";
        return;
    }
    let diamonds = Math.floor(coins / 10);
    convertDiamondOutput.value = `= ${diamonds} Elmas`;
});

// --- FREESHOP & ORDERS --- //

document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!currentUserData) {
            showToast("Baza məlumatı yüklənməyib!", true);
            return;
        }

        const diamondsAmount = parseInt(e.target.getAttribute('data-diamonds'));
        const coinCost = parseInt(e.target.getAttribute('data-cost'));

        if (currentUserData.coins < coinCost) {
            showToast("Kifayət qədər Coin balansınız yoxdur!", true);
            return;
        }

        // Open Modal
        pendingOrder = { diamonds: diamondsAmount, cost: coinCost, btn: e.target };
        document.getElementById('modal-diamonds').textContent = diamondsAmount;
        playerUidInput.value = '';
        orderModal.classList.add('show');
    });
});

modalCancel.addEventListener('click', () => {
    orderModal.classList.remove('show');
    pendingOrder = null;
});



async function loadUserHistory(uid) {
    const historyList = document.getElementById('order-history-list');
    if(!historyList) return;
    
    historyList.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">Yüklənir...</p>';
    
    try {
        const querySnapshot = await db.collection("orders").where("userId", "==", uid).get();
        let orders = [];
        querySnapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by timestamp descending
        orders.sort((a, b) => {
            let timeA = a.timestamp ? a.timestamp.toMillis() : 0;
            let timeB = b.timestamp ? b.timestamp.toMillis() : 0;
            return timeB - timeA;
        });

        historyList.innerHTML = '';
        if (orders.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">Hələ heç bir sifarişiniz yoxdur.</p>';
            return;
        }

        orders.forEach(order => {
            let dateStr = "İndi";
            if(order.timestamp) {
                dateStr = new Date(order.timestamp.toMillis()).toLocaleString('az-AZ');
            }
            
            let statusText = order.status === 'pending' ? '⏳ Gözləyir' : '✅ Tamamlandı';
            let statusColor = order.status === 'pending' ? 'var(--primary)' : 'var(--success)';
            
            historyList.innerHTML += `
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-bottom: 10px; font-size: 0.85rem; border-left: 3px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>💎 ${order.diamonds} Elmas</strong>
                        <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                    </div>
                    <div style="color: var(--text-muted); font-size: 0.75rem;">
                        Oyun ID: ${order.playerUid} | ${dateStr}
                    </div>
                </div>
            `;
        });

    } catch (e) {
        console.error("Tarixçə yüklənmədi:", e);
        historyList.innerHTML = '<p style="text-align: center; color: var(--error); font-size: 0.9rem;">Tarixçəni yükləmək mümkün olmadı.</p>';
    }
}

function sendTelegramNotification(playerUid, diamonds, cost) {
    const botToken = "7955618376:AAGwtstbD0qApk9GauBGx0JmmpI4USpMRc4";
    const chatId = "8093016770";
    const message = `🔥 YENİ SİFARİŞ 🔥\n\n🎮 Player UID: ${playerUid}\n💎 Elmas: ${diamonds}\n💰 Xərclənən Coin: ${cost}\n\nZəhmət olmasa yoxlayın!`;
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: message
        })
    }).catch(e => console.error("Telegram xətası:", e));
}

modalConfirm.addEventListener('click', async () => {
    if (!pendingOrder || !currentUserData) return;
    
    const uid = playerUidInput.value.trim();
    if (uid.length < 5) {
        showToast("Zəhmət olmasa düzgün Oyuncu ID (UID) daxil edin", true);
        return;
    }

    const { diamonds, cost, btn } = pendingOrder;

    const originalText = btn.textContent;
    btn.textContent = "...";
    btn.disabled = true;
    modalConfirm.disabled = true;
    modalConfirm.textContent = "Gözləyin...";

    try {
        // 1. Deduct coins locally and in DB
        await updateUserData({
            coins: currentUserData.coins - cost
        });

        // 2. Create the Order document in "orders" collection
        // 2. Create the Order document in "orders" collection
        await db.collection("orders").add({
            userId: auth.currentUser.uid,
            userEmail: currentUserData.email,
            playerUid: uid,
            diamonds: diamonds,
            cost: cost,
            status: "pending",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Send Telegram
        sendTelegramNotification(uid, diamonds, cost);

        // 4. Reload History
        loadUserHistory(auth.currentUser.uid);

        orderModal.classList.remove('show');
        showToast(`✅ Uğurlu! ${diamonds} Elmas sifariş edildi.`);

    } catch(e) {
        console.error(e);
        showToast("Xəta baş verdi!", true);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
        modalConfirm.disabled = false;
        modalConfirm.textContent = "Sifariş Ver";
        pendingOrder = null;
    }
});

// --- EVENT BINDINGS FOR TABS & NAVIGATION --- //
document.getElementById('link-login').addEventListener('click', () => switchTab('login'));
document.getElementById('link-register').addEventListener('click', () => switchTab('register'));
document.getElementById('go-freeshop-btn').addEventListener('click', () => switchView('freeshop-view'));
document.getElementById('go-dashboard-btn').addEventListener('click', () => switchView('dashboard-view'));

// --- MAIN TAB SWITCHING (Bottom Nav) --- //
function switchMainTab(tabId, navElement) {
    // Hide all section views
    document.querySelectorAll('.section-view').forEach(sv => sv.classList.remove('active'));
    // Show the target tab
    document.getElementById(tabId).classList.add('active');
    
    // Update nav active state
    document.querySelectorAll('.bottom-nav .nav-item').forEach(ni => ni.classList.remove('active'));
    if (navElement) navElement.classList.add('active');

    // Load leaderboard when coin tab is opened
    if (tabId === 'tab-coin') {
        loadLeaderboard();
    }
}

// --- LEADERBOARD --- //
async function loadLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;
    
    listEl.innerHTML = '<li style="text-align:center; opacity:0.5;">Yüklənir...</li>';

    try {
        const snapshot = await db.collection('users')
            .orderBy('coins', 'desc')
            .limit(20)
            .get();
        
        listEl.innerHTML = '';
        
        if (snapshot.empty) {
            listEl.innerHTML = '<li style="text-align:center; opacity:0.5;">Hələ ki heç kim yoxdur</li>';
            return;
        }

        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            
            let medalClass = '';
            let medalEmoji = '';
            if (rank === 1) { medalClass = 'gold'; medalEmoji = '🥇'; }
            else if (rank === 2) { medalClass = 'silver'; medalEmoji = '🥈'; }
            else if (rank === 3) { medalClass = 'bronze'; medalEmoji = '🥉'; }
            else { medalEmoji = `#${rank}`; }

            li.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="rank-badge ${medalClass}">${medalEmoji}</div>
                    <div>
                        <strong>${data.email ? data.email.split('@')[0] : 'Anonim'}</strong>
                        <br><small style="opacity:0.6;">ID: #${data.id || '????'}</small>
                    </div>
                </div>
                <div class="text-gold" style="font-weight:bold; font-size:1.1rem;">
                    ${data.coins || 0} 🪙
                </div>
            `;
            listEl.appendChild(li);
            rank++;
        });
    } catch (e) {
        console.error('Leaderboard error:', e);
        listEl.innerHTML = '<li style="text-align:center; color:#ff6b6b;">Xəta baş verdi</li>';
    }
}

// Load leaderboard on first dashboard open
auth.onAuthStateChanged((user) => {
    if (user) {
        setTimeout(() => loadLeaderboard(), 1500);
        setTimeout(() => loadStreamers(), 1800);
    }
});

// --- YAYINÇILAR (STREAMERS) SYSTEM --- //

const platformIcons = {
    youtube: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/512px-YouTube_full-color_icon_%282017%29.svg.png',
    tiktok: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/TikTok_logo.svg/512px-TikTok_logo.svg.png',
    twitch: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Twitch_Glitch_Logo_Purple.svg/512px-Twitch_Glitch_Logo_Purple.svg.png',
    instagram: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/512px-Instagram_logo_2016.svg.png'
};

const platformNames = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    twitch: 'Twitch',
    instagram: 'Instagram'
};

async function loadStreamers() {
    const listEl = document.getElementById('streamer-list');
    if (!listEl) return;

    listEl.innerHTML = '<li style="text-align:center; opacity:0.5;">Yüklənir...</li>';

    try {
        const snapshot = await db.collection('streamers').get();

        listEl.innerHTML = '';

        if (snapshot.empty) {
            listEl.innerHTML = '<li style="text-align:center; opacity:0.5;">Hələ yayınçı əlavə edilməyib</li>';
            return;
        }

        let streamersArray = [];
        snapshot.forEach(doc => {
            streamersArray.push({ id: doc.id, ...doc.data() });
        });

        // Siralama: Evvelce VIP-ler (isVip: true), sonra tarixe gore
        streamersArray.sort((a, b) => {
            const aVip = a.isVip ? 1 : 0;
            const bVip = b.isVip ? 1 : 0;
            if (aVip !== bVip) return bVip - aVip;
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });

        streamersArray.forEach(data => {
            const li = document.createElement('li');
            if (data.isVip) li.classList.add('vip-streamer'); 
            
            const platformIcon = platformIcons[data.platform] || platformIcons.youtube;
            
            let profileImg = platformIcon;
            const lowerName = (data.name || '').toLowerCase();
            if (lowerName.includes('shinigam') || lowerName.includes('shiniqam')) {
                profileImg = 'shinigami.png'; 
            } else if (data.photoURL) {
                profileImg = data.photoURL;
            }

            const platName = platformNames[data.platform] || data.platform;
            const vipBadge = data.isVip ? `<span class="badge" style="background:var(--gold); color:#000; margin-left:5px; box-shadow: 0 0 5px var(--gold);">VIP</span>` : '';

            li.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <div style="position:relative;">
                        <img src="${profileImg}" style="width:40px; height:40px; margin-right:15px; border-radius:50%; object-fit:cover; background-color:white; padding:2px; border: ${data.isVip ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)'};" alt="${platName}">
                        ${data.isVip ? '<div style="position:absolute; top:-5px; left:-5px; font-size:12px;">🌟</div>' : ''}
                    </div>
                    <div style="text-align:left;">
                        <strong>${data.name} ${vipBadge}</strong>
                        <br><small style="color:var(--secondary);">${platName}</small>
                    </div>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button class="secondary-btn" style="width:auto; padding:5px 15px;" onclick="window.open('${data.link}', '_blank')">İzlə</button>
                    ${isAdmin() ? `<button onclick="deleteStreamer('${data.id}')" style="background:rgba(255,0,0,0.2); border:none; color:#ff4d4d; cursor:pointer; padding:5px 10px; border-radius:5px;">Sil</button>` : ''}
                </div>
            `;
            listEl.appendChild(li);
        });
    } catch (e) {
        console.error('Streamers error:', e);
        listEl.innerHTML = '<li style="text-align:center; color:#ff6b6b;">Xəta baş verdi</li>';
    }
}

async function deleteStreamer(sid) {
    if(!confirm('Bu yayınçını silmək istəyirsiniz?')) return;
    try {
        await db.collection('streamers').doc(sid).delete();
        showToast('Yayınçı silindi');
        loadStreamers();
    } catch(e) { showToast('Xəta!', true); }
}

// Add Streamer
const addStreamerBtn = document.getElementById('add-streamer-btn');
if (addStreamerBtn) {
    addStreamerBtn.addEventListener('click', async () => {
        const nameInput = document.getElementById('streamer-name');
        const platformSelect = document.getElementById('streamer-platform');
        const linkInput = document.getElementById('streamer-link');
        const photoInput = document.getElementById('streamer-photo');
        const vipCheck = document.getElementById('streamer-vip');
        const msgEl = document.getElementById('streamer-message');

        const name = nameInput.value.trim();
        const platform = platformSelect.value;
        const link = linkInput.value.trim();
        const photoURL = photoInput ? photoInput.value.trim() : '';
        const isVip = vipCheck ? vipCheck.checked : false;

        if (!isAdmin()) {
            showToast('Yalnız admin əlavə edə bilər!', true);
            return;
        }

        msgEl.textContent = '';
        msgEl.className = '';

        if (!name || !link) {
            msgEl.textContent = '❌ Ad və link boş ola bilməz!';
            msgEl.classList.add('error-text');
            return;
        }

        addStreamerBtn.disabled = true;
        addStreamerBtn.textContent = 'Gözləyin...';

        try {
            await db.collection('streamers').add({
                name: name,
                platform: platform,
                link: link,
                photoURL: photoURL,
                isVip: isVip,
                addedBy: auth.currentUser ? auth.currentUser.uid : 'unknown',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            nameInput.value = '';
            linkInput.value = '';
            if(photoInput) photoInput.value = '';
            if(vipCheck) vipCheck.checked = false;
            msgEl.textContent = '✅ Yayınçı uğurla əlavə edildi!';
            msgEl.classList.add('success');
            showToast('Yayınçı əlavə olundu!');

            // Reload the list
            await loadStreamers();
        } catch (e) {
            console.error('Add streamer error:', e);
            msgEl.textContent = '❌ Xəta baş verdi: ' + e.message;
            msgEl.classList.add('error-text');
        } finally {
            addStreamerBtn.disabled = false;
            addStreamerBtn.textContent = 'Yayınçını Əlavə Et';
        }
    });
}

// --- USER: ADD PAID STREAMER (5000 Coin) ---
const userAddStreamerBtn = document.getElementById('user-add-streamer-btn');
if (userAddStreamerBtn) {
    userAddStreamerBtn.addEventListener('click', async () => {
        if (!auth.currentUser) {
            showToast('Zəhmət olmasa daxil olun!', true);
            return;
        }

        const nameInput = document.getElementById('u-streamer-name');
        const platformSelect = document.getElementById('u-streamer-platform');
        const linkInput = document.getElementById('u-streamer-link');
        const photoInput = document.getElementById('u-streamer-photo');

        const name = nameInput.value.trim();
        const platform = platformSelect.value;
        const link = linkInput.value.trim();
        const photoURL = photoInput ? photoInput.value.trim() : '';

        if (!name || !link) {
            showToast('❌ Boşluqları doldurun!', true);
            return;
        }

        const PRICE = 5000;
        if (!currentUserData || (currentUserData.coins || 0) < PRICE) {
            showToast(`❌ Kifayət qədər coin yoxdur! (Lazımdır: ${PRICE} 🪙)`, true);
            return;
        }

        if (!confirm(`Yayınını siyahıya əlavə etmək üçün hesabından ${PRICE} Coin çıxılacaq. Razısan?`)) return;

        userAddStreamerBtn.disabled = true;
        userAddStreamerBtn.textContent = 'Gözləyin...';

        try {
            const userRef = db.collection('users').doc(auth.currentUser.uid);
            
            // Transaction ile coin cixaq ve yayini elave edek
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const currentCoins = userDoc.data().coins || 0;
                
                if (currentCoins < PRICE) throw "Coin yetersiz!";
                
                // 1. Coin cix
                transaction.update(userRef, { coins: currentCoins - PRICE });
                
                // 2. Yayini elave et
                const streamerRef = db.collection('streamers').doc();
                transaction.set(streamerRef, {
                    name: name,
                    platform: platform,
                    link: link,
                    photoURL: photoURL,
                    isVip: false, // User elave edende VIP olmur
                    addedBy: auth.currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            nameInput.value = '';
            linkInput.value = '';
            if(photoInput) photoInput.value = '';
            showToast('✅ Təbriklər! Yayın siyahıya əlavə edildi.');
            
            // UI yenile
            if (typeof updateHeaderBalances === 'function') updateHeaderBalances();
            await loadStreamers();
        } catch (e) {
            console.error('User add error:', e);
            showToast('❌ Xəta: ' + (typeof e === 'string' ? e : e.message), true);
        } finally {
            userAddStreamerBtn.disabled = false;
            userAddStreamerBtn.textContent = 'Yayınımı Əlavə Et (-5000 🪙)';
        }
    });
}

// Also load streamers when switching to tab
const originalSwitchMainTab = switchMainTab;
switchMainTab = function(tabId, navElement) {
    originalSwitchMainTab(tabId, navElement);
    if (tabId === 'tab-streamers') {
        loadStreamers();
    }
    if (tabId === 'tab-clans') {
        loadClans();
    }
};

// ================================= //
// ADMIN SYSTEM — YALNIZ SƏN!       //
// ================================= //
// ⚠️ Öz email adresini bura yaz:
const ADMIN_EMAIL = 'tripl@gmail.com';

function isAdmin() {
    return auth.currentUser && auth.currentUser.email === ADMIN_EMAIL;
}

// Admin panellərini gizlə/göstər
function updateAdminUI() {
    const clanCreateSection = document.getElementById('create-clan-btn');
    const adminStreamerSection = document.getElementById('add-streamer-section');
    const userStreamerSection = document.getElementById('user-add-streamer-section');
    const adminTournamentPanel = document.getElementById('admin-tournament-panel');
    
    if (isAdmin()) {
        if (clanCreateSection) clanCreateSection.closest('.glass-card').style.display = 'block';
        if (adminStreamerSection) adminStreamerSection.style.display = 'block';
        if (userStreamerSection) userStreamerSection.style.display = 'none'; 
        if (adminTournamentPanel) adminTournamentPanel.style.display = 'block';
    } else {
        if (clanCreateSection) clanCreateSection.closest('.glass-card').style.display = 'none';
        if (adminStreamerSection) adminStreamerSection.style.display = 'none';
        if (userStreamerSection) userStreamerSection.style.display = 'block'; 
        if (adminTournamentPanel) adminTournamentPanel.style.display = 'none';
    }
}

// Auth dəyişəndə admin UI-ni yenilə
auth.onAuthStateChanged((user) => {
    if (user) {
        setTimeout(() => updateAdminUI(), 500);
    }
});

// ================================= //
// KLANLAR SİSTEMİ (Firebase)        //
// ================================= //
async function loadClans() {
    const listEl = document.getElementById('clan-list');
    if (!listEl) return;

    listEl.innerHTML = '<li style="text-align:center; opacity:0.5;">Yüklənir...</li>';

    try {
        const snapshot = await db.collection('clans')
            .orderBy('createdAt', 'desc')
            .get();

        listEl.innerHTML = '';

        // --- RƏSMİ KLANLAR (HƏMİŞƏ YUXARIDA) ---
        const officialClans = [
            { name: "TRIPL H", description: "Ana Klan - Rəsmi", isOfficial: true, logo: "tripleh.png", color: "var(--gold)" },
            { name: "H HEAVEN", description: "Alt Klan", isOfficial: true, logo: "heaven.png", color: "#a020f0" },
            { name: "H HELL", description: "Alt Klan", isOfficial: true, logo: "hell.png", color: "#ff4d4d" },
            { name: "H HARBİNGER", description: "Alt Klan", isOfficial: true, logo: "harbinger.png", color: "#00d4ff" }
        ];

        window.sendClanJoinRequest = function(clanName) {
            if (!auth.currentUser) {
                showToast("Zəhmət olmasa daxil olun!", true);
                return;
            }
            const uid = prompt(`${clanName} klanına qatılmaq üçün Oyunçu ID-nizi (UID) daxil edin:`);
            if (!uid || uid.trim().length < 5) {
                if(uid !== null) showToast("Düzgün UID daxil edin!", true);
                return;
            }
            
            const botToken = "7955618376:AAGwtstbD0qApk9GauBGx0JmmpI4USpMRc4";
            const chatId = "8093016770";
            const message = `🛡️ KLAN İSTƏYİ 🛡️\n\n🏰 Klan: ${clanName}\n🎮 Oyunçu UID: ${uid.trim()}\n\nZəhmət olmasa qəbul edib-etməyəcəyinizi yoxlayın!`;
            
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, text: message })
            }).then(() => {
                showToast(`✅ İstəyiniz göndərildi! (${clanName})`);
            }).catch(e => {
                showToast("Xəta baş verdi!", true);
            });
        };

        officialClans.forEach((clan, index) => {
            const li = document.createElement('li');
            li.style.border = `1px solid ${clan.color}`;
            li.style.background = `rgba(${clan.color === 'var(--gold)' ? '255, 193, 7' : '255, 255, 255'}, 0.05)`;
            li.style.padding = '10px 15px';

            const logoHtml = clan.logo 
                ? `<img src="${clan.logo}" style="width:45px; height:45px; border-radius:12px; margin-right:12px; border:2px solid ${clan.color}; object-fit:cover; box-shadow: 0 0 10px ${clan.color}44;">`
                : `<div class="rank-badge" style="background:var(--gold); color:#000;">${index + 1}</div>`;

            let joinBtnHtml = '';
            if (clan.name === "TRIPL H" || clan.name === "H HEAVEN") {
                joinBtnHtml = `<button onclick="sendClanJoinRequest('${clan.name}')" style="background:var(--primary); color:#fff; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:0.8rem; margin-right:10px;">Qatıl</button>`;
            }

            li.innerHTML = `
                <div style="display:flex; align-items:center; flex:1;">
                    ${logoHtml}
                    <div style="text-align:left;">
                        <strong style="color:${clan.color};">${clan.name}</strong>
                        <br><small style="opacity:0.6;">${clan.description}</small>
                    </div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    ${joinBtnHtml}
                    <span style="font-size:0.7rem; color:${clan.color}; font-weight:bold;">RƏSMİ</span>
                </div>
            `;
            listEl.appendChild(li);
        });

        if (snapshot.empty && officialClans.length === 0) {
            listEl.innerHTML = '<li style="text-align:center; opacity:0.5;">Hələ klan yaradılmayıb</li>';
            return;
        }

        let rank = officialClans.length + 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');

            // Sil düyməsini yalnız admin görür
            const deleteBtn = isAdmin() 
                ? `<button class="delete-clan-btn" data-id="${doc.id}" style="background:rgba(255,50,50,0.7); border:none; color:#fff; padding:5px 12px; border-radius:8px; cursor:pointer; font-family:'Outfit',sans-serif; font-size:0.75rem;">Sil</button>`
                : '';

            li.innerHTML = `
                <div style="display:flex; align-items:center; flex:1;">
                    <div class="rank-badge" style="background:${rank === 1 ? 'var(--gold)' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.06)'}; color:${rank <= 3 ? '#000' : 'var(--text-muted)'};">${rank}</div>
                    <div style="text-align:left;">
                        <strong>${data.name}</strong>
                        <br><small style="opacity:0.6;">${data.description || ''}</small>
                    </div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    ${deleteBtn}
                </div>
            `;
            listEl.appendChild(li);
            rank++;
        });

        // Sil düymələrinə event əlavə et
        document.querySelectorAll('.delete-clan-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const clanId = e.target.getAttribute('data-id');
                if (confirm('Bu klanı silmək istədiyinizdən əminsiniz?')) {
                    try {
                        await db.collection('clans').doc(clanId).delete();
                        showToast('Klan silindi!');
                        await loadClans();
                    } catch (err) {
                        console.error('Delete clan error:', err);
                        showToast('Xəta baş verdi!', true);
                    }
                }
            });
        });

    } catch (e) {
        console.error('Clans error:', e);
        listEl.innerHTML = '<li style="text-align:center; color:#ff6b6b;">Xəta baş verdi</li>';
    }
}

// Klan Yarat (Disabled)
const createClanBtn = document.getElementById('create-clan-btn');
if (createClanBtn) {
    createClanBtn.style.display = 'none';
}

// İlk yükləmə
auth.onAuthStateChanged((user) => {
    if (user) {
        setTimeout(() => loadClans(), 2000);
    }
});

// ================================= //
// TOURNAMENT COUNTDOWN SYSTEM       //
// ================================= //

let brInterval = null;
let parkourInterval = null;

function formatCountdown(distance) {
    if (distance < 0) return "BAŞLADI!";
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function loadTournamentCountdowns() {
    try {
        const docRef = await db.collection('system').doc('tournaments').get();
        if (docRef.exists) {
            const data = docRef.data();
            
            // BR Timer
            if (data.brTime) {
                const brTarget = new Date(data.brTime).getTime();
                if (brInterval) clearInterval(brInterval);
                brInterval = setInterval(() => {
                    const now = new Date().getTime();
                    const distance = brTarget - now;
                    const el = document.getElementById('br-countdown');
                    if (el) {
                        el.textContent = distance < 0 ? "🔥 BAŞLADI 🔥" : formatCountdown(distance);
                        if(distance < 0) clearInterval(brInterval);
                    }
                }, 1000);
                // Call once immediately to avoid 1 sec delay
                const distance = brTarget - new Date().getTime();
                const el = document.getElementById('br-countdown');
                if(el) el.textContent = distance < 0 ? "🔥 BAŞLADI 🔥" : formatCountdown(distance);
            }

            // Parkour Timer
            if (data.parkourTime) {
                const pkTarget = new Date(data.parkourTime).getTime();
                if (parkourInterval) clearInterval(parkourInterval);
                parkourInterval = setInterval(() => {
                    const now = new Date().getTime();
                    const distance = pkTarget - now;
                    const el = document.getElementById('parkour-countdown');
                    if (el) {
                        el.textContent = distance < 0 ? "🔥 BAŞLADI 🔥" : formatCountdown(distance);
                        if(distance < 0) clearInterval(parkourInterval);
                    }
                }, 1000);
                const distance = pkTarget - new Date().getTime();
                const el = document.getElementById('parkour-countdown');
                if(el) el.textContent = distance < 0 ? "🔥 BAŞLADI 🔥" : formatCountdown(distance);
            }
        }
    } catch(e) { console.error("Geri sayım xətası", e); }
}

// Initial Load for Countdowns
setTimeout(() => loadTournamentCountdowns(), 1000);

// Admin Listeners
const adminBrBtn = document.getElementById('admin-br-set-btn');
const adminParkourBtn = document.getElementById('admin-parkour-set-btn');

if (adminBrBtn) {
    adminBrBtn.addEventListener('click', async () => {
        const timeVal = document.getElementById('admin-br-time').value;
        if(!timeVal) return showToast("Vaxt seçin!", true);
        
        const originalText = adminBrBtn.textContent;
        adminBrBtn.textContent = '...';
        adminBrBtn.disabled = true;
        
        try {
            await db.collection('system').doc('tournaments').set({ brTime: timeVal }, { merge: true });
            showToast("✅ BR Geri Sayım quruldu!");
            loadTournamentCountdowns();
        } catch(e) { 
            showToast("Xəta baş verdi!", true); 
        } finally {
            adminBrBtn.textContent = originalText;
            adminBrBtn.disabled = false;
        }
    });
}

if (adminParkourBtn) {
    adminParkourBtn.addEventListener('click', async () => {
        const timeVal = document.getElementById('admin-parkour-time').value;
        if(!timeVal) return showToast("Vaxt seçin!", true);
        
        const originalText = adminParkourBtn.textContent;
        adminParkourBtn.textContent = '...';
        adminParkourBtn.disabled = true;
        
        try {
            await db.collection('system').doc('tournaments').set({ parkourTime: timeVal }, { merge: true });
            showToast("✅ Parkur Geri Sayım quruldu!");
            loadTournamentCountdowns();
        } catch(e) { 
            showToast("Xəta baş verdi!", true); 
        } finally {
            adminParkourBtn.textContent = originalText;
            adminParkourBtn.disabled = false;
        }
    });
}

// VIP Tournament Registration
const vipTourneyBtn = document.getElementById('vip-tournament-btn');
if (vipTourneyBtn) {
    vipTourneyBtn.addEventListener('click', async () => {
        if (!auth.currentUser || !currentUserData) {
            showToast('Zəhmət olmasa daxil olun!', true);
            return;
        }

        const PRICE = 300;
        if (currentUserData.coins < PRICE) {
            showToast(`Kifayət qədər Coin yoxdur! (Lazımdır: ${PRICE} 🪙)`, true);
            return;
        }

        const uid = prompt('VIP Turnirə qeydiyyat üçün Oyunçu ID-nizi (UID) daxil edin:');
        if (!uid || uid.trim().length < 5) {
            if(uid !== null) showToast('Düzgün UID daxil edin!', true);
            return;
        }

        if (!confirm(`Hesabınızdan ${PRICE} Coin çıxılacaq. Təsdiq edirsiniz?`)) return;

        vipTourneyBtn.disabled = true;
        vipTourneyBtn.textContent = 'Gözləyin...';

        try {
            const userRef = db.collection('users').doc(auth.currentUser.uid);
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const currentCoins = userDoc.data().coins || 0;
                if (currentCoins < PRICE) throw "Coin yetersiz!";
                transaction.update(userRef, { coins: currentCoins - PRICE });
            });

            // Send Telegram Notification
            const botToken = "7955618376:AAGwtstbD0qApk9GauBGx0JmmpI4USpMRc4";
            const chatId = "8093016770";
            const message = `🌟 VIP TURNİR QEYDİYYATI 🌟\n\n🎮 Oyunçu UID: ${uid.trim()}\n🪙 Ödəniş: ${PRICE} Coin\n📧 Hesab: ${currentUserData.email}\n\nZəhmət olmasa siyahıya əlavə edin!`;
            
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, text: message })
            });

            showToast('✅ Qeydiyyat uğurla tamamlandı!');
            if (typeof updateHeaderBalances === 'function') updateHeaderBalances();
        } catch (e) {
            console.error(e);
            showToast('Xəta baş verdi!', true);
        } finally {
            vipTourneyBtn.disabled = false;
            vipTourneyBtn.textContent = 'Qeydiyyatdan Keç (-300 🪙)';
        }
    });
}
