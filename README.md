# 03-sgbacquaparka-julios-completo
03-sgbacquaparka-julios-completo
Crie uma aplicação Web Progressiva (PWA) completa para a gestão de sócios e acesso a um parque aquático. A aplicação deve ser gerada em um único passo, com todos os arquivos necessários (HTML, CSS, JavaScript, manifest, service worker, e Cloud Functions) prontos para serem baixados e implantados no Firebase Hosting.

Tecnologias e Configurações:

Frontend: HTML5, CSS3, JavaScript (ES6+). Deve ser responsivo e funcionar em dispositivos móveis.

Backend e Infraestrutura: Firebase (utilize a SDK v9 modular import { initializeApp } from 'firebase/app';).

Authentication: Para login de usuários com email/senha e controle de acesso baseado em papéis.

Firestore Database: Para armazenar todos os dados da aplicação.

Storage: Para upload de fotos de rosto e documentos.

Hosting: Para hospedar o PWA.

Functions: Para a lógica de backend segura, especificamente a comunicação com a API do Asaas.

Integração de Pagamento: Asaas.

Chave API Asaas (para ser usada EXCLUSIVAMENTE na Cloud Function): $aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJmNjUzYjA3LTlhYWItNDM0Ni1iYmNlLTg2ZGNiY2M2Y2E5Nzo6JGFhY2hfOTk0YTVjYjMtM2ZjYy00ZDBhLTkyODYtYTJjZWRiYzZmMzc0

Configurações do Firebase (para o client-side):

JavaScript

// For Firebase JS SDK v9 and later
const firebaseConfig = {
  apiKey: "AIzaSyCmdAtBmNaJAEJEiU6QfoqdwOUa7vhL8dk",
  authDomain: "sgbacquapark-julios.firebaseapp.com",
  projectId: "sgbacquapark-julios",
  storageBucket: "sgbacquapark-julios.firebasestorage.app",
  messagingSenderId: "447883532999",
  appId: "1:447883532999:web:e40cb22f3465538038bce2",
  measurementId: "G-QDYMW2SDMM"
};
Estrutura do Firestore Database:

users: Coleção para armazenar usuários da gestão e sócios.

Documento (ID automático ou UID do Auth).

Campos: email (string), role (string: 'CEO', 'Secretaria', 'Portaria', 'SocioFamiliar'), uid (string), passaporteId (string, para sócios), asaasCustomerId (string, para sócios).

passaportes: Coleção para os passaportes dos sócios.

Documento (ID automático).

Campos: numeroPassaporte (string), responsavelNome (string), responsavelCPF (string), responsavelDataNascimento (date), email (string), telefone (string), endereco (string), planoId (string), asaasCustomerId (string).

Subcoleção carteirinhas:

Documento (ID automático).

Campos: nomeCompleto (string), grauParentesco (string), cpf_rg (string), dataNascimento (date), fotoRostoUrl (string), fotoDocumentoUrl (string), qrCodeData (string).

planos: Coleção para os planos de mensalidade.

Documento (ID automático).

Campos: nome (string), valor (number), descricao (string).

accessLogs: Coleção para registrar os acessos.

Documento (ID automático).

Campos: carteirinhaId (string), passaporteId (string), timestamp (timestamp), status (string: 'liberado', 'encaminhado').

Estrutura de Arquivos Sugerida:

/index.html

/style.css

/app.js (Lógica principal, roteamento)

/firebase-init.js (Inicialização do Firebase com a config)

/manifest.json (Para o PWA)

/service-worker.js (Para funcionalidades offline)

/functions/index.js (Para a Cloud Function de integração com Asaas)

DETALHAMENTO DAS FUNCIONALIDADES E TELAS:

1. Tela de Login (Página Inicial)

UI: Logomarca no topo, formulário com campos "Email" e "Senha", botão "Entrar", e um link/botão "Cadastrar Usuário".

Lógica:

Botão "Entrar": Autentica o usuário com signInWithEmailAndPassword. Após o login, busca o documento do usuário na coleção users (usando o uid) para obter seu role e redireciona para a tela inicial correspondente.

Botão "Cadastrar Usuário": Leva para um fluxo de criação de conta.

2. Fluxo de "Cadastrar Usuário" (Para usuários já pré-cadastrados no Firestore e para Sócios)

UI: Campo para "Email" e botão "Enviar".

Lógica:

O usuário digita o email e clica em "Enviar".

A aplicação verifica na coleção users se existe um documento com este email.

Se encontrar, e o campo uid estiver vazio, usa createUserWithEmailAndPassword (pode usar uma senha temporária ou pedir para o usuário criar na hora).

Após a criação do usuário no Authentication, o uid gerado é salvo no campo uid do documento correspondente na coleção users.

A aplicação dispara um email de verificação e redefinição de senha (sendPasswordResetEmail) para que o usuário crie sua senha definitiva.

3. Tela Inicial do 'CEO' (role: 'CEO')

UI: Quatro botões grandes e claros: 'Gerenciar Usuários', 'Gerenciar Passaportes', 'Gerenciar Planos', e 'Sair'.

Lógica: Cada botão navega para a tela correspondente. 'Sair' executa signOut().

4. Tela 'Gerenciar Usuários' (Acesso: CEO)

UI:

Seção "Novo Usuário": Campo "Email do usuário", um <select> para "Tipo de Usuário" com opções ('CEO', 'Secretaria', 'Portaria'), e um botão "Cadastrar Usuário".

Seção "Lista de Usuários": Lista os usuários existentes (email e role) da coleção users. Cada item da lista deve ter um ícone de lixeira para exclusão.

Botão flutuante "Voltar" no canto inferior esquerdo.

Lógica:

"Cadastrar Usuário": Cria um novo documento na coleção users com o email e o role selecionado. O campo uid fica em branco até o usuário fazer o primeiro acesso.

Ícone de lixeira: Exclui o documento do usuário do Firestore. (Opcional avançado: excluir também do Firebase Auth).

5. Tela 'Gerenciar Passaportes' (Acesso: CEO, Secretaria)

UI:

Botão 'Criar Novo Passaporte'.

Formulário de busca: Um <select> para escolher o critério ('Número do Passaporte', 'Nome do Responsável', 'CPF do responsável', 'Nome do Titular'), um campo de texto para o valor da busca, botão "Buscar" e botão "Limpar".

Lista mostrando os últimos 20 passaportes criados (Número, Nome do Responsável). Cada item tem um botão "Editar" que leva à tela de edição.

Botão flutuante "Voltar".

6. Tela 'Criar Novo Passaporte' (Acesso: CEO, Secretaria)

UI: Formulário "Dados do Responsável Financeiro" com campos: 'Nome Completo', 'CPF', 'Data de Nascimento', 'Email', 'Telefone', 'Endereço', um <select> para 'Plano' (puxar da coleção planos), um <select> "Passaporte Novo?" (Sim/Não). Se "Não", mostrar campos 'Tipo de Passaporte' e 'Número do Passaporte Antigo'. Botão "Criar Passaporte".

Lógica:

Ao clicar em "Criar Passaporte":

Cria um novo documento na coleção passaportes com os dados do formulário.

Gera um numeroPassaporte sequencial (ex: 0000001).

Cria um documento correspondente na coleção users com role: 'SocioFamiliar' e o email fornecido.

Integração Asaas: Chama uma Cloud Function (findOrCreateAsaasCustomer) passando o CPF e nome.

A Cloud Function usa a API do Asaas para buscar um cliente pelo CPF. Se não encontrar, cria um novo. A função retorna o id do cliente Asaas (cus_...).

A aplicação salva esse asaasCustomerId nos documentos do passaporte e do user no Firestore.

Exibe a mensagem "Cadastro foi realizado com sucesso" e redireciona para a tela de 'Gerenciar Passaportes'.

7. Tela 'Editar Passaporte'

UI:

Formulário com campos não editáveis: 'Número do Passaporte', 'Nome Completo', 'CPF', 'Data de Nascimento'.

Formulário com campos editáveis: 'Email', 'Telefone', 'Endereço', <select> de 'Plano'.

Botão "Adicionar Carteirinha".

Seção de "Carteirinhas" em formato de carrossel de cards. Cada card mostra: Foto (ou mensagem de aviso), QR Code, Nome, Data de Nascimento, Grau de Parentesco. Cada card tem um botão "Editar".

Lógica: Salva as alterações dos campos editáveis no documento do passaporte no Firestore.

8. Tela 'Adicionar / Editar Carteirinha'

UI:

Formulário com campos: <select> 'Grau de Parentesco' (com as opções fornecidas), 'Nome Completo', 'CPF/CNH/ID ou CN', 'Data de Nascimento'.

Botão "Tirar Foto Rosto".

Botão "Tirar Foto Documento".

Botão "Salvar" ou "Adicionar Carteirinha".

Lógica:

Botões de Foto: Usar a API navigator.mediaDevices.getUserMedia para abrir a câmera. Desenhar a imagem em um <canvas> para redimensionar (proporção 3x4) e comprimir a qualidade (canvas.toDataURL('image/jpeg', quality)) para atender aos limites de 150kb (rosto) e 400kb (documento). Fazer upload do blob resultante para o Firebase Storage.

Botão Salvar/Adicionar:

Para "Adicionar", cria um novo documento na subcoleção carteirinhas do passaporte correspondente.

Gera um QR Code (usando uma biblioteca como qrcode.js) contendo uma string única (ex: passaporteId_carteirinhaId). Salva esta string no campo qrCodeData.

Salva as URLs das fotos (obtidas após o upload no Storage) e os outros dados do formulário.

Exibe mensagem de sucesso e volta para a tela 'Editar Passaporte'.

9. Tela 'Gerenciar Planos' (Acesso: CEO)

UI:

Formulário "Novo Plano": 'Nome do Plano', 'Valor Mensal', 'Descrição do Plano', botão 'Salvar Plano'.

Lista de planos existentes: Cada item mostra Nome, Valor, Descrição e botões 'Editar' e 'Excluir'.

Botão flutuante "Voltar".

Lógica: CRUD completo para a coleção planos no Firestore. A exclusão deve ter um confirm().

10. Tela Inicial da 'Secretaria' (role: 'Secretaria')

UI: Simples, com dois botões: 'Gerenciar Passaportes' e 'Sair'.

11. Tela Inicial da 'Portaria' (role: 'Portaria')

UI:

Interface de câmera ocupando a maior parte da tela para leitura de QR Code (usar uma biblioteca como html5-qrcode).

Botão 'Sair'.

Lógica:

Ao ler um QR Code, a aplicação decodifica a string (passaporteId_carteirinhaId).

Busca os dados da carteirinha e do passaporte no Firestore.

Chama uma Cloud Function (checkFinancialStatus) passando o asaasCustomerId do responsável.

A Cloud Function consulta a API do Asaas e retorna a situação financeira ('em dia', 'em atraso', 'bloqueado').

UI de Resultado: Mostra os dados da carteirinha (Foto, Nome, etc.) e a situação financeira.

UI de Ação: Exibe dois botões: 'Liberar Acesso' e 'Encaminhar à Secretaria'.

Ao clicar, registra um evento na coleção accessLogs com o status correspondente e volta automaticamente para o modo de leitura de QR Code.

12. Tela Inicial do 'SocioFamiliar' (role: 'SocioFamiliar')

UI:

Card de cabeçalho: 'Número do Passaporte', 'Nome do Responsável', 'Plano'.

Botão 'Situação Financeira'.

Botão 'Adicionar Carteirinha'.

Carrossel de cards com as carteirinhas do passaporte (mesmo layout da tela de edição).

Seção "Situação Financeira" (inicialmente oculta): listará as cobranças vencidas, a vencer e pagas.

Lógica:

Botão 'Situação Financeira':

Ao carregar a tela, o botão inicia com texto "Situação Financeira" e uma animação de "buscando".

Chama a Cloud Function (getFinancialDetails) passando o asaasCustomerId.

A função retorna a lista de cobranças e um status geral.

A aplicação atualiza o botão: Verde com ícone 'ok' (tudo em dia), Amarelo com ícone 'atenção' (uma vencida), Vermelho com ícone 'bloqueado' (mais de uma vencida ou política de bloqueio).

Ao clicar no botão (após carregar), a seção "Situação Financeira" abaixo é exibida, populada com os dados retornados pela função.

'Adicionar Carteirinha': Leva para uma versão simplificada da tela de adicionar, sem os botões de upload de foto (só dados cadastrais). O sócio adiciona o dependente, que depois precisa ir à secretaria para tirar as fotos.

13. Firebase Cloud Function (functions/index.js)

Crie funções HTTP acionáveis para interagir com a API Asaas. Use functions.config() para armazenar a chave da API de forma segura, não a coloque diretamente no código.

findOrCreateAsaasCustomer(data, context): Recebe CPF, nome, etc. Busca ou cria cliente no Asaas.

checkFinancialStatus(data, context): Recebe asaasCustomerId, retorna o status geral.

getFinancialDetails(data, context): Recebe asaasCustomerId, retorna a lista detalhada de cobranças.

Por favor, gere todo o código para esta aplicação PWA em uma única resposta, seguindo todas as especificações acima.
