// Imports from Firebase and initialization file
import { auth, db, storage, functions } from './firebase-init.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";
import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-functions.js";


// --- Global State ---
const appState = {
    currentUser: null,
    userRole: null,
    currentScreen: 'login-screen',
    editingPassportId: null,
    editingCarteirinhaId: null,
};

// --- DOM Elements ---
const screens = document.querySelectorAll('.screen');
const loadingOverlay = document.getElementById('loading-overlay');

// --- Helper Functions ---
const showLoading = (show = true) => {
    loadingOverlay.style.display = show ? 'flex' : 'none';
};

const navigateTo = (screenId) => {
    screens.forEach(screen => {
        screen.style.display = screen.id === screenId ? 'block' : 'none';
    });
    appState.currentScreen = screenId;
    window.scrollTo(0, 0);
};

const showAlert = (message, type = 'info') => {
    // Simple alert for now. Could be replaced with a custom modal.
    alert(message);
};

// --- Navigation ---
document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('back-button')) {
        // A simple history mechanism can be implemented here if needed
        // For now, let's define specific back actions
        if (appState.currentScreen === 'manage-users-screen' || appState.currentScreen === 'manage-passports-screen' || appState.currentScreen === 'manage-plans-screen') {
            navigateTo('ceo-home-screen');
        } else if (appState.currentScreen === 'create-passport-screen' || appState.currentScreen === 'edit-passport-screen') {
            navigateTo('manage-passports-screen');
        } else if (appState.currentScreen === 'edit-carteirinha-screen') {
            navigateTo('edit-passport-screen');
            renderEditPassportScreen(appState.editingPassportId); // Re-render parent screen
        } else if (appState.currentScreen === 'register-user-flow-screen') {
            navigateTo('login-screen');
        }
    }
    if (e.target.classList.contains('logout-button')) {
        signOut(auth).catch(err => showAlert(`Erro ao sair: ${err.message}`, 'error'));
    }
});


// --- Authentication ---
onAuthStateChanged(auth, async (user) => {
    showLoading(true);
    if (user) {
        appState.currentUser = user;
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                appState.userRole = userData.role;
                appState.passaporteId = userData.passaporteId; // For SocioFamiliar
                appState.asaasCustomerId = userData.asaasCustomerId; // For SocioFamiliar
                routeUser(userData.role);
            } else {
                showAlert('Dados do usuário não encontrados. Contacte o suporte.', 'error');
                signOut(auth);
            }
        } catch (error) {
            showAlert(`Erro ao buscar dados do usuário: ${error.message}`, 'error');
            signOut(auth);
        }
    } else {
        appState.currentUser = null;
        appState.userRole = null;
        navigateTo('login-screen');
    }
    showLoading(false);
});

const routeUser = (role) => {
    switch (role) {
        case 'CEO':
            navigateTo('ceo-home-screen');
            break;
        case 'Secretaria':
            navigateTo('secretaria-home-screen');
            break;
        case 'Portaria':
            navigateTo('portaria-home-screen');
            initPortariaScreen();
            break;
        case 'SocioFamiliar':
            navigateTo('socio-home-screen');
            renderSocioHomeScreen();
            break;
        default:
            navigateTo('login-screen');
            showAlert('Tipo de usuário desconhecido.', 'error');
    }
};

// Login Form
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    showLoading();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => {
            showAlert(`Erro no login: ${error.message}`, 'error');
        })
        .finally(() => showLoading(false));
});

// Show Register User Flow
document.getElementById('show-register-user-flow').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('register-user-flow-screen');
});

// Register User Flow Form
document.getElementById('register-user-flow-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    const email = document.getElementById('register-flow-email').value;
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showAlert('Email não encontrado na nossa base de dados. Contacte a secretaria.', 'error');
            return;
        }

        const userDoc = querySnapshot.docs[0];
        if (userDoc.data().uid) {
            showAlert('Este usuário já está cadastrado. Tente fazer login ou redefinir a senha.', 'warning');
            return;
        }

        // Use a temporary password, user will be forced to reset it.
        const tempPassword = Math.random().toString(36).slice(-8);
        const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
        const user = userCredential.user;

        // Update Firestore doc with the new UID
        await updateDoc(doc(db, 'users', userDoc.id), { uid: user.uid });

        // Send password reset email
        await sendPasswordResetEmail(auth, email);

        showAlert('Usuário criado! Um email foi enviado para você criar sua senha definitiva. Verifique sua caixa de entrada e spam.', 'success');
        navigateTo('login-screen');

    } catch (error) {
        showAlert(`Erro no processo de cadastro: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
});


// --- CEO Dashboard ---
document.getElementById('ceo-home-screen').addEventListener('click', (e) => {
    if (e.target.id === 'ceo-manage-users') {
        navigateTo('manage-users-screen');
        renderManageUsersScreen();
    } else if (e.target.id === 'ceo-manage-passports') {
        navigateTo('manage-passports-screen');
        renderManagePassportsScreen();
    } else if (e.target.id === 'ceo-manage-plans') {
        navigateTo('manage-plans-screen');
        renderManagePlansScreen();
    }
});

// --- User Management (CEO) ---
const renderManageUsersScreen = async () => {
    showLoading();
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    try {
        const q = query(collection(db, 'users'), where("role", "!=", "SocioFamiliar"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            const user = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${user.email} - <strong>${user.role}</strong></span>
                <div class="actions">
                    <button class="delete-user-button" data-id="${doc.id}">🗑️</button>
                </div>
            `;
            usersList.appendChild(li);
        });
    } catch (error) {
        showAlert(`Erro ao listar usuários: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
};

document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('new-user-email').value;
    const role = document.getElementById('new-user-role').value;
    showLoading();
    try {
        // Check if user already exists
        const q = query(collection(db, 'users'), where("email", "==", email));
        const existingUser = await getDocs(q);
        if (!existingUser.empty) {
            showAlert('Um usuário com este email já existe.', 'warning');
            return;
        }

        await addDoc(collection(db, 'users'), {
            email: email,
            role: role,
            uid: null, // UID will be added on first login
        });
        showAlert('Usuário cadastrado com sucesso!', 'success');
        document.getElementById('add-user-form').reset();
        renderManageUsersScreen();
    } catch (error) {
        showAlert(`Erro ao cadastrar usuário: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
});

document.getElementById('users-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-user-button')) {
        const userId = e.target.dataset.id;
        if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
            showLoading();
            try {
                await deleteDoc(doc(db, 'users', userId));
                showAlert('Usuário excluído com sucesso.', 'success');
                renderManageUsersScreen();
                // Note: Advanced functionality would involve deleting the user from Firebase Auth as well,
                // which requires a Cloud Function for security reasons.
            } catch (error) {
                showAlert(`Erro ao excluir usuário: ${error.message}`, 'error');
            } finally {
                showLoading(false);
            }
        }
    }
});


// --- Plan Management (CEO) ---
const renderManagePlansScreen = async () => {
    showLoading();
    const plansList = document.getElementById('plans-list');
    plansList.innerHTML = '';
    try {
        const querySnapshot = await getDocs(collection(db, 'planos'));
        querySnapshot.forEach(doc => {
            const plan = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${plan.nome}</strong><br>
                    <span>Valor: R$ ${plan.valor.toFixed(2)}</span><br>
                    <small>${plan.descricao}</small>
                </div>
                <div class="actions">
                    <button class="edit-plan-button" data-id="${doc.id}">✏️</button>
                    <button class="delete-plan-button" data-id="${doc.id}">🗑️</button>
                </div>
            `;
            plansList.appendChild(li);
        });
    } catch (error) {
        showAlert(`Erro ao listar planos: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
};

const populatePlanSelects = async (selectElementId, selectedValue = '') => {
    const select = document.getElementById(selectElementId);
    select.innerHTML = '<option value="">Selecione um Plano</option>';
    try {
        const querySnapshot = await getDocs(collection(db, 'planos'));
        querySnapshot.forEach(doc => {
            const plan = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${plan.nome} - R$ ${plan.valor.toFixed(2)}`;
            if(doc.id === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        showAlert(`Erro ao carregar planos: ${error.message}`, 'error');
    }
};

document.getElementById('plan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const planId = document.getElementById('plan-id').value;
    const plan = {
        nome: document.getElementById('plan-name').value,
        valor: parseFloat(document.getElementById('plan-value').value),
        descricao: document.getElementById('plan-description').value,
    };
    showLoading();
    try {
        if (planId) {
            // Update
            await updateDoc(doc(db, 'planos', planId), plan);
            showAlert('Plano atualizado com sucesso!', 'success');
        } else {
            // Create
            await addDoc(collection(db, 'planos'), plan);
            showAlert('Plano criado com sucesso!', 'success');
        }
        document.getElementById('plan-form').reset();
        document.getElementById('plan-id').value = '';
        document.getElementById('cancel-edit-plan').style.display = 'none';
        renderManagePlansScreen();
    } catch (error) {
        showAlert(`Erro ao salvar plano: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
});

document.getElementById('plans-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-plan-button')) {
        const planId = e.target.dataset.id;
        if (confirm('Tem certeza que deseja excluir este plano?')) {
            showLoading();
            try {
                await deleteDoc(doc(db, 'planos', planId));
                showAlert('Plano excluído com sucesso.', 'success');
                renderManagePlansScreen();
            } catch (error) {
                showAlert(`Erro ao excluir plano: ${error.message}`, 'error');
            } finally {
                showLoading(false);
            }
        }
    } else if (e.target.classList.contains('edit-plan-button')) {
        const planId = e.target.dataset.id;
        const planDoc = await getDoc(doc(db, 'planos', planId));
        if (planDoc.exists()) {
            const plan = planDoc.data();
            document.getElementById('plan-id').value = planId;
            document.getElementById('plan-name').value = plan.nome;
            document.getElementById('plan-value').value = plan.valor;
            document.getElementById('plan-description').value = plan.descricao;
            document.getElementById('cancel-edit-plan').style.display = 'inline-block';
            window.scrollTo(0, 0);
        }
    }
});

document.getElementById('cancel-edit-plan').addEventListener('click', () => {
    document.getElementById('plan-form').reset();
    document.getElementById('plan-id').value = '';
    document.getElementById('cancel-edit-plan').style.display = 'none';
});


// --- Passport Management ---
const renderManagePassportsScreen = async (querySnapshot = null) => {
    showLoading();
    const passportsList = document.getElementById('passports-list');
    passportsList.innerHTML = '';
    try {
        if (!querySnapshot) {
            const q = query(collection(db, 'passaportes'), orderBy('numeroPassaporte', 'desc'), limit(20));
            querySnapshot = await getDocs(q);
        }
        if(querySnapshot.empty) {
            passportsList.innerHTML = '<li>Nenhum passaporte encontrado.</li>';
        } else {
            querySnapshot.forEach(doc => {
                const passport = doc.data();
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>#${passport.numeroPassaporte} - ${passport.responsavelNome}</span>
                    <div class="actions">
                        <button class="edit-passport-button" data-id="${doc.id}">Editar</button>
                    </div>
                `;
                passportsList.appendChild(li);
            });
        }
    } catch (error) {
        showAlert(`Erro ao listar passaportes: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
};

document.getElementById('create-new-passport-button').addEventListener('click', () => {
    navigateTo('create-passport-screen');
    document.getElementById('create-passport-form').reset();
    populatePlanSelects('responsavel-plano');
});

document.getElementById('passaporte-novo-select').addEventListener('change', (e) => {
    document.getElementById('passaporte-antigo-fields').style.display = e.target.value === 'Não' ? 'block' : 'none';
});

// Generate next passport number
const getNextPassportNumber = async () => {
    const q = query(collection(db, 'passaportes'), orderBy('numeroPassaporte', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return '0000001';
    }
    const lastNumber = parseInt(querySnapshot.docs[0].data().numeroPassaporte, 10);
    return (lastNumber + 1).toString().padStart(7, '0');
};

document.getElementById('create-passport-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    try {
        const findOrCreateAsaasCustomer = httpsCallable(functions, 'findOrCreateAsaasCustomer');
        const asaasCustomerData = {
            name: document.getElementById('responsavel-nome').value,
            cpfCnpj: document.getElementById('responsavel-cpf').value,
            email: document.getElementById('responsavel-email').value,
            mobilePhone: document.getElementById('responsavel-telefone').value,
        };
        const asaasResult = await findOrCreateAsaasCustomer(asaasCustomerData);
        const asaasCustomerId = asaasResult.data.id;

        if (!asaasCustomerId) {
            throw new Error("Não foi possível criar o cliente no sistema de pagamentos.");
        }

        const newPassportNumber = await getNextPassportNumber();

        const passportData = {
            numeroPassaporte: newPassportNumber,
            responsavelNome: document.getElementById('responsavel-nome').value,
            responsavelCPF: document.getElementById('responsavel-cpf').value,
            responsavelDataNascimento: Timestamp.fromDate(new Date(document.getElementById('responsavel-data-nascimento').value)),
            email: document.getElementById('responsavel-email').value,
            telefone: document.getElementById('responsavel-telefone').value,
            endereco: document.getElementById('responsavel-endereco').value,
            planoId: document.getElementById('responsavel-plano').value,
            asaasCustomerId: asaasCustomerId,
            createdAt: Timestamp.now()
        };

        const passportDocRef = await addDoc(collection(db, 'passaportes'), passportData);

        // Create corresponding user doc for the family
        await addDoc(collection(db, 'users'), {
            email: passportData.email,
            role: 'SocioFamiliar',
            uid: null,
            passaporteId: passportDocRef.id,
            asaasCustomerId: asaasCustomerId,
        });

        showAlert('Passaporte criado com sucesso! Número: ' + newPassportNumber, 'success');
        navigateTo('manage-passports-screen');
        renderManagePassportsScreen();

    } catch (error) {
        showAlert(`Erro ao criar passaporte: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
});

document.getElementById('search-passport-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    const criteria = document.getElementById('search-criteria').value;
    const value = document.getElementById('search-value').value;

    if (!value) {
        renderManagePassportsScreen(); // just render latest if empty
        return;
    }

    let q;
    const passaportesRef = collection(db, 'passaportes');

    try {
        if (criteria === 'carteirinhaNome') {
            // This requires a more complex query, searching in a subcollection
            const carteirinhasRef = collection(db, 'passaportes', 'carteirinhas'); // This is not the right way to query
            showAlert("Busca por nome de titular ainda não implementada.", "info"); // Placeholder
            // Proper implementation would require duplicating data or using a different data model/search service
            return;
        } else {
            q = query(passaportesRef, where(criteria, "==", value));
        }

        const querySnapshot = await getDocs(q);
        renderManagePassportsScreen(querySnapshot);

    } catch (error) {
        showAlert(`Erro na busca: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
});

document.getElementById('clear-search-button').addEventListener('click', () => {
    document.getElementById('search-passport-form').reset();
    renderManagePassportsScreen();
});

document.getElementById('passports-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-passport-button')) {
        const passportId = e.target.dataset.id;
        appState.editingPassportId = passportId;
        navigateTo('edit-passport-screen');
        renderEditPassportScreen(passportId);
    }
});


// --- Edit Passport & Carteirinhas ---
const renderEditPassportScreen = async (passportId) => {
    showLoading();
    try {
        const passportRef = doc(db, 'passaportes', passportId);
        const passportSnap = await getDoc(passportRef);

        if (!passportSnap.exists()) {
            showAlert('Passaporte não encontrado.', 'error');
            navigateTo('manage-passports-screen');
            return;
        }

        const passport = passportSnap.data();
        // Populate non-editable fields
        document.getElementById('edit-passaporte-numero').textContent = passport.numeroPassaporte;
        document.getElementById('edit-responsavel-nome').textContent = passport.responsavelNome;
        document.getElementById('edit-responsavel-cpf').textContent = passport.responsavelCPF;
        document.getElementById('edit-responsavel-data-nascimento').textContent = passport.responsavelDataNascimento.toDate().toLocaleDateString('pt-BR');

        // Populate editable fields
        document.getElementById('edit-responsavel-email').value = passport.email;
        document.getElementById('edit-responsavel-telefone').value = passport.telefone;
        document.getElementById('edit-responsavel-endereco').value = passport.endereco;
        await populatePlanSelects('edit-responsavel-plano', passport.planoId);

        // Render carteirinhas
        await renderCarteirinhasCarousel(passportId, 'carteirinhas-carousel');

    } catch (error) {
        showAlert(`Erro ao carregar dados do passaporte: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
};

document.getElementById('edit-passport-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    try {
        const passportRef = doc(db, 'passaportes', appState.editingPassportId);
        await updateDoc(passportRef, {
            email: document.getElementById('edit-responsavel-email').value,
            telefone: document.getElementById('edit-responsavel-telefone').value,
            endereco: document.getElementById('edit-responsavel-endereco').value,
            planoId: document.getElementById('edit-responsavel-plano').value,
        });
        showAlert('Dados do passaporte atualizados com sucesso!', 'success');
    } catch (error) {
        showAlert(`Erro ao atualizar passaporte: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
});

const renderCarteirinhasCarousel = async (passportId, carouselId) => {
    const carousel = document.getElementById(carouselId);
    carousel.innerHTML = '';
    const carteirinhasRef = collection(db, 'passaportes', passportId, 'carteirinhas');
    const querySnapshot = await getDocs(carteirinhasRef);

    if (querySnapshot.empty) {
        carousel.innerHTML = '<p>Nenhuma carteirinha cadastrada.</p>';
        return;
    }

    querySnapshot.forEach(doc => {
        const carteirinha = doc.data();
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${carteirinha.fotoRostoUrl || 'placeholder.png'}" alt="Foto de Rosto">
            <div id="qr-${doc.id}" class="qr-code"></div>
            <h4>${carteirinha.nomeCompleto}</h4>
            <p>Nascimento: ${carteirinha.dataNascimento.toDate().toLocaleDateString('pt-BR')}</p>
            <p>Parentesco: ${carteirinha.grauParentesco}</p>
            ${appState.userRole !== 'SocioFamiliar' ? `<button class="edit-carteirinha-button" data-id="${doc.id}">Editar</button>` : ''}
        `;
        carousel.appendChild(card);
        // Generate QR Code
        if (carteirinha.qrCodeData) {
            new QRCode(document.getElementById(`qr-${doc.id}`), {
                text: carteirinha.qrCodeData,
                width: 100,
                height: 100,
            });
        }
    });
};

document.getElementById('add-carteirinha-button').addEventListener('click', () => {
    appState.editingCarteirinhaId = null;
    document.getElementById('carteirinha-form').reset();
    document.getElementById('carteirinha-form-title').textContent = 'Adicionar Carteirinha';
    document.getElementById('face-photo-preview').src = '';
    document.getElementById('doc-photo-preview').src = '';
    navigateTo('edit-carteirinha-screen');
});

document.getElementById('carteirinhas-carousel').addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-carteirinha-button')) {
        const carteirinhaId = e.target.dataset.id;
        appState.editingCarteirinhaId = carteirinhaId;
        showLoading();
        try {
            const carteirinhaRef = doc(db, 'passaportes', appState.editingPassportId, 'carteirinhas', carteirinhaId);
            const carteirinhaSnap = await getDoc(carteirinhaRef);
            if (carteirinhaSnap.exists()) {
                const data = carteirinhaSnap.data();
                document.getElementById('carteirinha-form-title').textContent = 'Editar Carteirinha';
                document.getElementById('carteirinha-id').value = carteirinhaId;
                document.getElementById('carteirinha-parentesco').value = data.grauParentesco;
                document.getElementById('carteirinha-nome').value = data.nomeCompleto;
                document.getElementById('carteirinha-doc').value = data.cpf_rg;
                document.getElementById('carteirinha-data-nascimento').valueAsDate = data.dataNascimento.toDate();
                document.getElementById('face-photo-preview').src = data.fotoRostoUrl || '';
                document.getElementById('doc-photo-preview').src = data.fotoDocumentoUrl || '';
                navigateTo('edit-carteirinha-screen');
            }
        } catch (error) {
            showAlert(`Erro ao carregar carteirinha: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }
});

// Photo Capture Logic
let facePhotoBlob = null;
let docPhotoBlob = null;
const takePhoto = async (type) => {
    const previewEl = document.getElementById(`${type}-photo-preview`);
    const canvas = document.getElementById('photo-canvas');
    const ctx = canvas.getContext('2d');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Simple UI to capture photo from stream
        const captureButton = document.createElement('button');
        captureButton.textContent = `Capturar Foto ${type === 'face' ? 'do Rosto' : 'do Documento'}`;

        const videoContainer = document.createElement('div');
        videoContainer.style.position = 'fixed';
        videoContainer.style.top = '0';
        videoContainer.style.left = '0';
        videoContainer.style.width = '100%';
        videoContainer.style.height = '100%';
        videoContainer.style.backgroundColor = 'black';
        videoContainer.style.zIndex = '10000';
        videoContainer.appendChild(video);
        videoContainer.appendChild(captureButton);
        document.body.appendChild(videoContainer);

        video.style.width = '100%';
        video.style.height = 'calc(100% - 50px)';
        captureButton.style.width = '100%';
        captureButton.style.height = '50px';

        captureButton.onclick = () => {
            // Resize based on type
            const targetWidth = type === 'face' ? 480 : 800; // Example dimensions
            const scale = targetWidth / video.videoWidth;
            canvas.width = targetWidth;
            canvas.height = video.videoHeight * scale;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const quality = type === 'face' ? 0.7 : 0.8; // JPEG quality
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            previewEl.src = dataUrl;

            canvas.toBlob(blob => {
                const maxSize = type === 'face' ? 150 * 1024 : 400 * 1024;
                if(blob.size > maxSize) {
                    showAlert(`A foto é muito grande (${(blob.size/1024).toFixed(0)} KB). O limite é ${maxSize/1024} KB. Tente novamente.`, 'warning');
                    return;
                }

                if (type === 'face') {
                    facePhotoBlob = blob;
                } else {
                    docPhotoBlob = blob;
                }
            }, 'image/jpeg', quality);

            stream.getTracks().forEach(track => track.stop());
            document.body.removeChild(videoContainer);
        };

    } catch (err) {
        showAlert(`Erro ao acessar a câmera: ${err.message}`, 'error');
    }
};

document.getElementById('take-face-photo-button').addEventListener('click', () => takePhoto('face'));
document.getElementById('take-doc-photo-button').addEventListener('click', () => takePhoto('doc'));


// Save Carteirinha Form
document.getElementById('carteirinha-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    try {
        const carteirinhaId = document.getElementById('carteirinha-id').value;
        const passportId = appState.editingPassportId;

        // 1. Upload photos if they exist
        let facePhotoUrl = document.getElementById('face-photo-preview').src;
        let docPhotoUrl = document.getElementById('doc-photo-preview').src;

        if (facePhotoBlob) {
            const storageRef = ref(storage, `passaportes/${passportId}/carteirinhas/${Date.now()}_face.jpg`);
            const snapshot = await uploadBytes(storageRef, facePhotoBlob);
            facePhotoUrl = await getDownloadURL(snapshot.ref);
            facePhotoBlob = null;
        }
        if (docPhotoBlob) {
            const storageRef = ref(storage, `passaportes/${passportId}/carteirinhas/${Date.now()}_doc.jpg`);
            const snapshot = await uploadBytes(storageRef, docPhotoBlob);
            docPhotoUrl = await getDownloadURL(snapshot.ref);
            docPhotoBlob = null;
        }

        // 2. Prepare data
        const carteirinhaData = {
            grauParentesco: document.getElementById('carteirinha-parentesco').value,
            nomeCompleto: document.getElementById('carteirinha-nome').value,
            cpf_rg: document.getElementById('carteirinha-doc').value,
            dataNascimento: Timestamp.fromDate(new Date(document.getElementById('carteirinha-data-nascimento').value)),
            fotoRostoUrl: facePhotoUrl.startsWith('http') ? facePhotoUrl : '',
            fotoDocumentoUrl: docPhotoUrl.startsWith('http') ? docPhotoUrl : '',
        };

        // 3. Save to Firestore
        if (carteirinhaId) { // Update existing
            const carteirinhaRef = doc(db, 'passaportes', passportId, 'carteirinhas', carteirinhaId);
            await updateDoc(carteirinhaRef, carteirinhaData);
            showAlert('Carteirinha atualizada com sucesso!', 'success');
        } else { // Create new
            const carteirinhasRef = collection(db, 'passaportes', passportId, 'carteirinhas');
            const newDocRef = await addDoc(carteirinhasRef, carteirinhaData);
            // Generate QR code data and update the doc
            const qrCodeData = `${passportId}_${newDocRef.id}`;
            await updateDoc(newDocRef, { qrCodeData: qrCodeData });
            showAlert('Carteirinha adicionada com sucesso!', 'success');
        }

        navigateTo('edit-passport-screen');
        renderEditPassportScreen(passportId);

    } catch (error) {
        showAlert(`Erro ao salvar carteirinha: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
});


// --- Secretaria Dashboard ---
document.getElementById('secretaria-home-screen').addEventListener('click', (e) => {
    if (e.target.id === 'secretaria-manage-passports') {
        navigateTo('manage-passports-screen');
        renderManagePassportsScreen();
    }
});


// --- Portaria QR Scanner ---
let qrScanner = null;
const initPortariaScreen = () => {
    if (!qrScanner) {
        qrScanner = new Html5Qrcode("qr-reader");
    }
    startQrScanner();
};

const startQrScanner = () => {
    document.getElementById('qr-reader-result').style.display = 'none';
    document.getElementById('qr-reader').style.display = 'block';

    qrScanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        async (decodedText, decodedResult) => {
            await qrScanner.stop();
            handleQrCodeScan(decodedText);
        },
        (errorMessage) => {
            // handle scan failure, usually better to ignore
        })
    .catch((err) => {
        showAlert(`Não foi possível iniciar o scanner: ${err}`, 'error');
    });
};

const handleQrCodeScan = async (qrData) => {
    showLoading();
    document.getElementById('qr-reader').style.display = 'none';
    document.getElementById('qr-reader-result').style.display = 'block';

    try {
        const [passportId, carteirinhaId] = qrData.split('_');
        if (!passportId || !carteirinhaId) {
            throw new Error('QR Code inválido.');
        }

        // 1. Get carteirinha and passport data
        const carteirinhaRef = doc(db, 'passaportes', passportId, 'carteirinhas', carteirinhaId);
        const passportRef = doc(db, 'passaportes', passportId);

        const [carteirinhaSnap, passportSnap] = await Promise.all([getDoc(carteirinhaRef), getDoc(passportRef)]);

        if (!carteirinhaSnap.exists() || !passportSnap.exists()) {
            throw new Error('Dados não encontrados.');
        }
        const carteirinha = carteirinhaSnap.data();
        const passport = passportSnap.data();

        // 2. Check financial status via Cloud Function
        const checkFinancialStatus = httpsCallable(functions, 'checkFinancialStatus');
        const financialResult = await checkFinancialStatus({ asaasCustomerId: passport.asaasCustomerId });
        const status = financialResult.data.status; // 'em dia', 'em atraso', 'bloqueado'

        // 3. Display result
        const resultCard = document.getElementById('access-result-card');
        resultCard.innerHTML = `
            <img src="${carteirinha.fotoRostoUrl || 'placeholder.png'}" alt="Foto">
            <h4>${carteirinha.nomeCompleto}</h4>
            <p>Passaporte: ${passport.numeroPassaporte}</p>
            <p>Situação: <span class="status ${status.replace(' ', '-')}">${status.toUpperCase()}</span></p>
        `;

        // 4. Setup action buttons
        document.getElementById('grant-access-button').onclick = () => logAccess(passportId, carteirinhaId, 'liberado');
        document.getElementById('forward-to-secretary-button').onclick = () => logAccess(passportId, carteirinhaId, 'encaminhado');

    } catch (error) {
        document.getElementById('access-result-card').innerHTML = `<p style="color: red;">Erro: ${error.message}</p>`;
        setTimeout(startQrScanner, 3000); // Restart scanner after error
    } finally {
        showLoading(false);
    }
};

const logAccess = async (passportId, carteirinhaId, status) => {
    showLoading();
    try {
        await addDoc(collection(db, 'accessLogs'), {
            passportId: passportId,
            carteirinhaId: carteirinhaId,
            timestamp: Timestamp.now(),
            status: status,
            recordedBy: appState.currentUser.uid
        });
        showAlert(`Acesso registrado como: ${status}`, 'success');
    } catch (error) {
        showAlert(`Erro ao registrar acesso: ${error.message}`, 'error');
    } finally {
        showLoading(false);
        startQrScanner(); // Go back to scanning
    }
};


// --- SocioFamiliar Dashboard ---
const renderSocioHomeScreen = async () => {
    showLoading();
    try {
        if(!appState.passaporteId) {
            throw new Error("ID do passaporte não encontrado para este sócio.");
        }
        const passportRef = doc(db, 'passaportes', appState.passaporteId);
        const passportSnap = await getDoc(passportRef);
        if(!passportSnap.exists()) {
            throw new Error("Dados do passaporte não encontrados.");
        }
        const passport = passportSnap.data();

        const planRef = doc(db, 'planos', passport.planoId);
        const planSnap = await getDoc(planRef);
        const planName = planSnap.exists() ? planSnap.data().nome : 'N/A';

        document.getElementById('socio-passaporte-numero').textContent = passport.numeroPassaporte;
        document.getElementById('socio-responsavel-nome').textContent = passport.responsavelNome;
        document.getElementById('socio-plano-nome').textContent = planName;

        await renderCarteirinhasCarousel(appState.passaporteId, 'socio-carteirinhas-carousel');

        // Start financial status check
        checkSocioFinancials();

    } catch (error) {
        showAlert(`Erro ao carregar painel do sócio: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
};

const checkSocioFinancials = async () => {
    const button = document.getElementById('check-financial-status-button');
    button.textContent = 'Buscando situação...';
    button.className = 'loading';
    button.disabled = true;

    try {
        const getFinancialDetails = httpsCallable(functions, 'getFinancialDetails');
        const result = await getFinancialDetails({ asaasCustomerId: appState.asaasCustomerId });
        const { status, charges } = result.data;

        button.textContent = 'Situação Financeira';
        button.disabled = false;
        if (status === 'em dia') button.className = 'ok';
        else if (status === 'em atraso') button.className = 'warning';
        else button.className = 'danger';

        // Populate charges list
        const chargesList = document.getElementById('charges-list');
        chargesList.innerHTML = '';
        if (charges && charges.length > 0) {
            charges.forEach(charge => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>Venc: ${new Date(charge.dueDate).toLocaleDateString('pt-BR')}</span>
                    <strong>R$ ${charge.value.toFixed(2)}</strong>
                    <span>Status: ${charge.status}</span>
                    ${charge.bankSlipUrl ? `<a href="${charge.bankSlipUrl}" target="_blank">Ver Boleto</a>` : ''}
                `;
                chargesList.appendChild(li);
            });
        } else {
            chargesList.innerHTML = '<li>Nenhuma cobrança encontrada.</li>';
        }
    } catch (error) {
        button.textContent = 'Erro ao buscar dados';
        button.className = 'danger';
        showAlert(`Erro ao buscar dados financeiros: ${error.message}`, 'error');
    }
};

document.getElementById('check-financial-status-button').addEventListener('click', (e) => {
    const section = document.getElementById('financial-details-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('socio-add-carteirinha-button').addEventListener('click', () => {
    // Simplified version of the form for socios
    // In a real app, this might lead to a form without photo uploads,
    // creating a "pending" carteirinha that needs secretary approval/photos.
    showAlert("Para adicionar dependentes, por favor, dirija-se à secretaria do parque.", "info");
});


// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial check to see if a user is already logged in
    // onAuthStateChanged will handle the initial routing
});
