document.addEventListener('DOMContentLoaded', () => {

  /* ========= MOBILE NAVBAR ========= */
  const menuBtn = document.getElementById('menuBtn');
  const navLinks = document.querySelector('.nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');

      const icon = menuBtn.querySelector('i');
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-times');
    });
  }

  /* ========= SEE MORE OFFERS ========= */
  const seeMoreBtn = document.getElementById("seeMoreBtn");
  if (seeMoreBtn) {
    seeMoreBtn.addEventListener("click", function () {
      alert("More offers coming soon! Check back later for new discounts.");
      this.textContent = "Offers Loading...";
      setTimeout(() => {
        this.textContent = "See All Offers";
      }, 2000);
    });
  }

  /* ========= DATE & TIME ========= */
  function updateDateTime() {
  const el = document.getElementById('currentDateTime');
  if (!el) return; // 👈 prevent crash
  el.textContent = new Date().toLocaleString('en-US');
}

  updateDateTime();
  setInterval(updateDateTime, 1000);

  /* ========= SLIDESHOW ========= */
  const slides = document.querySelectorAll('.slideshow-container .slide');
  let currentIndex = 0;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
  }

  if (slides.length > 0) {
    setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      showSlide(currentIndex);
    }, 2000);
  }

  /* ========= DISCOUNT SLIDER ========= */
  const slider = document.querySelector('.slider');
  const items = document.querySelectorAll('.discount-item');
  const leftBtn = document.querySelector('.left');
  const rightBtn = document.querySelector('.right');

  let index = 0;
  const visibleCount = 3;

  function updateSlider() {
    if (!items.length) return;
    const moveX = index * (items[0].offsetWidth + 20);
    slider.style.transform = `translateX(-${moveX}px)`;
  }

  if (rightBtn && leftBtn) {
    rightBtn.addEventListener('click', () => {
      index = (index + 1) % (items.length - visibleCount + 1);
      updateSlider();
    });

    leftBtn.addEventListener('click', () => {
      index = index <= 0 ? items.length - visibleCount : index - 1;
      updateSlider();
    });
  }

});
// State Management
const STORAGE_KEY = 'cashit_data';
const CURRENT_USER_KEY = 'cashit_current_user';

// Initial Data
const INITIAL_ADMIN = {
    id: 'admin-1',
    name: 'Bank Administrator',
    cnic: '00000-0000000-0',
    pin: '1234',
    balance: 0,
    savings: 0,
    role: 'admin',
    isActive: true
};

class Store {
    constructor() {
        this.load();
    }

    load() {
        const data = localStorage.getItem(STORAGE_KEY);
        console.log("Loaded data:", data);
        if (data) {
            const parsed = JSON.parse(data);
            this.users = parsed.users || [INITIAL_ADMIN];
            this.transactions = parsed.transactions || [];
        } else {
            this.users = [INITIAL_ADMIN];
            this.transactions = [];
            this.save();
        }
        

        const user = localStorage.getItem(CURRENT_USER_KEY);
        this.currentUser = user ? JSON.parse(user) : null;
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            users: this.users,
            transactions: this.transactions
        }));
    }

    // Auth Actions
    register(name, cnic, pin) {
        if (this.users.find(u => u.cnic === cnic)) {
            return { success: false, message: 'CNIC already registered' };
        }

        const newUser = {
            id: Date.now().toString(),
            name,
            cnic,
            pin,
            balance: 500, 
            savings: 0,
            role: 'user',
            isActive: true
        };

        this.users.push(newUser);
        this.save();
        return { success: true, message: 'Registration successful! Please login.' };
    }

    login(cnic, pin, isAdminLogin = false) {
        const user = this.users.find(u => u.cnic === cnic && u.pin === pin);
        
        if (!user) return { success: false, message: 'Invalid credentials' };
        if (!user.isActive) return { success: false, message: 'Account is deactivated' };

        // Enforce role separation
        if (isAdminLogin && user.role !== 'admin') {
            return { success: false, message: 'Access Denied: Not an admin account' };
        }
        if (!isAdminLogin && user.role === 'admin') {
            return { success: false, message: 'Please use the Admin Portal' };
        }

        this.currentUser = user;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return { success: true, message: 'Login successful' };
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(CURRENT_USER_KEY);
        window.location.href = 'index.html';
    }

    // Financial Actions
    transfer(amount, recipientCnic) {
        if (!this.currentUser) return { success: false, message: 'Session expired' };
        amount = Number(amount);
        
        if (this.currentUser.balance < amount) return { success: false, message: 'Insufficient funds' };
        
        const recipient = this.users.find(u => u.cnic === recipientCnic);
        if (!recipient) return { success: false, message: 'Recipient CNIC not found' };
        if (recipient.id === this.currentUser.id) return { success: false, message: 'Cannot transfer to self' };

        // Update balances
        this.updateUserBalance(this.currentUser.id, -amount);
        this.updateUserBalance(recipient.id, amount);

        // Record Transactions
        this.addTransaction({
            userId: this.currentUser.id,
            type: 'transfer',
            amount: amount,
            description: `Transfer to ${recipient.name}`,
            isDebit: true
        });

        this.addTransaction({
            userId: recipient.id,
            type: 'deposit',
            amount: amount,
            description: `Received from ${this.currentUser.name}`,
            isDebit: false
        });

        return { success: true, message: 'Transfer successful' };
    }

    payBill(amount, type, consumerId) {
        if (!this.currentUser) return { success: false, message: 'Session expired' };
        amount = Number(amount);

        if (this.currentUser.balance < amount) return { success: false, message: 'Insufficient funds' };

        this.updateUserBalance(this.currentUser.id, -amount);
        
        this.addTransaction({
            userId: this.currentUser.id,
            type: 'bill',
            amount: amount,
            description: `${type} Bill`,
            isDebit: true
        });

        return { success: true, message: 'Bill paid successfully' };
    }

    payTax(amount, taxId) {
        if (!this.currentUser) return { success: false, message: 'Session expired' };
        amount = Number(amount);

        if (this.currentUser.balance < amount) return { success: false, message: 'Insufficient funds' };

        this.updateUserBalance(this.currentUser.id, -amount);
        
        this.addTransaction({
            userId: this.currentUser.id,
            type: 'tax',
            amount: amount,
            description: `Tax Payment (PSID: ${taxId})`,
            isDebit: true
        });

        return { success: true, message: 'Tax paid successfully' };
    }
    // Challan Payment
payChallan(amount, challanNumber, psid) {
    if (!this.currentUser) return { success: false, message: 'Session expired' };
    amount = Number(amount);
    if (this.currentUser.balance < amount) return { success: false, message: 'Insufficient funds' };

    this.updateUserBalance(this.currentUser.id, -amount);

    this.addTransaction({
        userId: this.currentUser.id,
        type: 'challan',
        amount,
        description: `Challan Payment (${challanNumber}, PSID: ${psid})`,
        isDebit: true
    });

    return { success: true, message: 'Challan paid successfully' };
}

// Fee Payment
payFee(amount, institute, rollNo, psid) {
    if (!this.currentUser) return { success: false, message: 'Session expired' };
    amount = Number(amount);
    if (this.currentUser.balance < amount) return { success: false, message: 'Insufficient funds' };

    this.updateUserBalance(this.currentUser.id, -amount);

    this.addTransaction({
        userId: this.currentUser.id,
        type: 'fee',
        amount,
        description: `Fee Payment (${institute}, Roll No: ${rollNo}, PSID: ${psid})`,
        isDebit: true
    });

    return { success: true, message: 'Fee paid successfully' };
}


    // Admin Actions
    toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.isActive = !user.isActive;
            this.save();
            return { success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}` };
        }
        return { success: false, message: 'User not found' };
    }

    adminAddFunds(userId, amount) {
        amount = Number(amount);
        this.updateUserBalance(userId, amount);
        this.addTransaction({
            userId: userId,
            type: 'deposit',
            amount: amount,
            description: 'Admin Deposit',
            isDebit: false
        });
        return { success: true, message: 'Funds added successfully' };
    }

    adminDeductTax(userId, amount) {
        amount = Number(amount);
        const user = this.users.find(u => u.id === userId);
        if (user.balance < amount) return { success: false, message: 'Insufficient user funds' };

        this.updateUserBalance(userId, -amount);
        this.addTransaction({
            userId: userId,
            type: 'tax',
            amount: amount,
            description: 'Admin Tax Deduction',
            isDebit: true
        });
        return { success: true, message: 'Tax deducted successfully' };
    }

    // Helpers
    updateUserBalance(userId, change) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.balance += change;
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser.balance = user.balance;
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.currentUser));
            }
            this.save();
        }
    }

    addTransaction(tx) {
        this.transactions.push({
            id: Date.now().toString() + Math.random().toString().slice(2, 5),
            date: new Date().toISOString(),
            ...tx
        });
        this.save();
    }

    getTransactions(userId) {
        return this.transactions
            .filter(t => t.userId === userId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
}

const store = new Store();

// UI Utilities
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 24px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        z-index: 1000;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function checkAuth(adminOnly = false) {
    if (!store.currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    if (adminOnly) {
        if (store.currentUser.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return false;
        }
    } else {
        if (store.currentUser.role === 'admin') {
            window.location.href = 'admin.html';
            return false;
        }
    }
    return true;
}

// Page Specific Initialization
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // Common: Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            store.logout();
        });
    }

    // Common: User Name Display
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && store.currentUser) {
        userNameDisplay.textContent = store.currentUser.name;
    }

    // LOGIN PAGE (Customer)
    if (path.includes('login.html')) {
        const loginForm = document.getElementById('loginForm');
        loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const cnic = document.getElementById('cnic').value;
            const pin = document.getElementById('pin').value;
            
            const result = store.login(cnic, pin, false); // false = user login
            if (result.success) {
                window.location.href = 'dashboard.html';
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    // ADMIN LOGIN PAGE
    if (path.includes('admin-login.html')) {
        const adminLoginForm = document.getElementById('adminLoginForm');
        adminLoginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const cnic = document.getElementById('cnic').value;
            const pin = document.getElementById('pin').value;
            
            const result = store.login(cnic, pin, true); // true = admin login
            if (result.success) {
                window.location.href = 'admin.html';
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    // REGISTER PAGE
    if (path.includes('register.html')) {
        const registerForm = document.getElementById('registerForm');
        registerForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const cnic = document.getElementById('cnic').value;
            const pin = document.getElementById('pin').value;
            const confirmPin = document.getElementById('confirmPin').value;

            // Basic Validation
            if (pin !== confirmPin) {
                showToast('PINs do not match', 'error');
                return;
            }
            if (!/^\d{5}-\d{7}-\d{1}$/.test(cnic)) {
                showToast('Invalid CNIC format', 'error');
                return;
            }

            const result = store.register(name, cnic, pin);
            if (result.success) {
                showToast(result.message, 'success');
                setTimeout(() => window.location.href = 'login.html', 1500);
            } else {
                showToast(result.message, 'error');
            }
        });
    }

    // DASHBOARD PAGE
    if (path.includes('dashboard.html')) {
        if (!checkAuth(false)) return;

        // Populate User Info
        document.getElementById('accountName').textContent = store.currentUser.name;
        document.getElementById('accountCnic').textContent = store.currentUser.cnic;

        // Render Stats
        document.getElementById('totalBalance').textContent = `PKR ${store.currentUser.balance.toLocaleString()}`;
        document.getElementById('totalSavings').textContent = `PKR ${store.currentUser.savings.toLocaleString()}`;
        
        // Calculate Monthly Spending (Simple)
        const currentMonth = new Date().getMonth();
        const spending = store.getTransactions(store.currentUser.id)
            .filter(t => t.isDebit && new Date(t.date).getMonth() === currentMonth)
            .reduce((sum, t) => sum + t.amount, 0);
        
        document.getElementById('monthlySpending').textContent = `PKR ${spending.toLocaleString()}`;

        // Render Transactions
        const txList = document.getElementById('transactionList');
        const transactions = store.getTransactions(store.currentUser.id).slice(0, 5); // Last 5

        if (transactions.length === 0) {
            txList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color: #64748b;">No recent transactions</td></tr>';
        } else {
            txList.innerHTML = transactions.map(tx => `
                <tr>
                    <td style="font-weight:500;">${tx.description}</td>
                    <td style="color:#64748b;">${new Date(tx.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</td>
                    <td><span class="status status-success">Completed</span></td>
                    <td style="text-align:right;" class="${tx.isDebit ? 'amount-neg' : 'amount-pos'}">
                        ${tx.isDebit ? '-' : '+'} PKR ${tx.amount.toLocaleString()}
                    </td>
                </tr>
            `).join('');
        }
    }

 // PAYMENTS PAGE
if (path.includes('payments.html')) {
    if (!checkAuth(false)) return;

    function handleForm(formId, getDataCallback, actionCallback) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const data = getDataCallback(form);
                const result = actionCallback(data);
                showToast(result.message, result.success ? 'success' : 'error');
                if (result.success) form.reset();
            } catch(err) {
                console.error(err);
                showToast('An error occurred. Check console.', 'error');
            }
        });
    }

    // TRANSFER
    handleForm('transferForm', (form) => ({
        amount: parseFloat(form.querySelector('#transferAmount').value),
        recipientCnic: form.querySelector('#recipientCnic').value.trim()
    }), (data) => store.transfer(data.amount, data.recipientCnic));

    // BILL
    handleForm('billForm', (form) => ({
        amount: parseFloat(form.querySelector('#billAmount').value),
        billType: form.querySelector('#billType').value,
        consumerId: form.querySelector('#consumerId').value.trim()
    }), (data) => store.payBill(data.amount, data.billType, data.consumerId));

    // TAX
    handleForm('taxForm', (form) => ({
        amount: parseFloat(form.querySelector('#taxAmount').value),
        taxId: form.querySelector('#taxId').value.trim()
    }), (data) => store.payTax(data.amount, data.taxId));

    // CHALLAN
    handleForm(
    'challanForm',
    (form) => ({
        amount: parseFloat(form.challanAmount.value),
        challanNumber: form.challanNumber.value.trim(),
        psid: form.challanPisd.value.trim()
    }),
    (data) => store.payChallan(data.amount, data.challanNumber, data.psid)
);

    // FEE
    handleForm(
    'feeForm',
    (form) => ({
        amount: parseFloat(form.feeAmount.value),
        institute: form.instituteName.value.trim(),
        rollNo: form.rollNo.value.trim(),
        challanNumber: form.feePisd.value.trim()
    }),
    (data) => store.payFee(data.amount, data.institute, data.rollNo, data.challanNumber)
);
}


    // ADMIN PAGE (Reusing previous logic, just ensuring it works with new script)
    if (path.includes('admin.html')) {
        if (!checkAuth(true)) return;

        const renderUsers = () => {
            const userList = document.getElementById('userList');
            const users = store.users.filter(u => u.role !== 'admin');
            
            if (users.length === 0) {
                userList.innerHTML = '<tr><td colspan="5" style="text-align:center">No users found</td></tr>';
                return;
            }

            userList.innerHTML = users.map(user => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.cnic}</td>
                    <td>PKR ${(user.balance ?? 0).toLocaleString()}</td>
                    <td>
                        <span style="color: ${user.isActive ? 'var(--success)' : 'var(--danger)'}">
                            ${user.isActive ? 'Active' : 'Deactivated'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="openFundModal('${user.id}')">Manage Funds</button>
                        <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="toggleStatus('${user.id}')">
                            ${user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                </tr>
            `).join('');
        };

        renderUsers();

        window.toggleStatus = (userId) => {
            const result = store.toggleUserStatus(userId);
            showToast(result.message, 'success');
            renderUsers();
        };

        window.openFundModal = (userId) => {
            const amount = prompt("Enter amount:");
            if (!amount) return;
            
            const action = confirm("Click OK to ADD funds, Cancel to DEDUCT tax.");
            
            let result;
            if (action) {
                result = store.adminAddFunds(userId, amount);
            } else {
                result = store.adminDeductTax(userId, amount);
            }
            
            showToast(result.message, result.success ? 'success' : 'error');
            renderUsers();
        };
    }
});
    // CHANGE PASSWORD PAGE

document.addEventListener('DOMContentLoaded', () => {
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const messageEl = document.getElementById('message');

            if (store.currentUser.pin !== currentPassword) {
                messageEl.textContent = 'Incorrect current password.';
                messageEl.style.color = 'red';
                return;
            }

            if (newPassword !== confirmPassword) {
                messageEl.textContent = 'New passwords do not match.';
                messageEl.style.color = 'red';
                return;
            }

            if (newPassword.length < 4) {
                messageEl.textContent = 'Password must be at least 4 characters long.';
                messageEl.style.color = 'red';
                return;
            }

            store.currentUser.pin = newPassword;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(store.currentUser));

            messageEl.textContent = 'Password changed successfully!';
            messageEl.style.color = 'green';

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        });
    }
});
