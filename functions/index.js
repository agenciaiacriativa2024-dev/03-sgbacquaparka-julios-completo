const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// It's crucial to set the Asaas API key in your Firebase environment:
// firebase functions:config:set asaas.apikey="YOUR_ASAAS_API_KEY"
const asaasApiKey = functions.config().asaas.apikey;
const asaasApiUrl = "https://www.asaas.com/api/v3";

const asaasHeaders = {
    "Content-Type": "application/json",
    "access_token": asaasApiKey,
};

/**
 * Finds a customer on Asaas by CPF/CNPJ. If not found, creates a new one.
 */
exports.findOrCreateAsaasCustomer = functions.https.onCall(async (data, context) => {
    const { name, cpfCnpj, email, mobilePhone } = data;

    if (!name || !cpfCnpj) {
        throw new functions.https.HttpsError("invalid-argument", "Nome e CPF/CNPJ são obrigatórios.");
    }

    try {
        // 1. Search for customer by CPF/CNPJ
        let response = await axios.get(`${asaasApiUrl}/customers`, {
            params: { cpfCnpj: cpfCnpj },
            headers: asaasHeaders,
        });

        if (response.data.data.length > 0) {
            // Customer found, return the first result
            return { id: response.data.data[0].id };
        } else {
            // 2. Customer not found, create a new one
            const newCustomerData = {
                name,
                cpfCnpj,
                email,
                mobilePhone,
            };
            response = await axios.post(`${asaasApiUrl}/customers`, newCustomerData, {
                headers: asaasHeaders,
            });
            // Return the new customer's ID
            return { id: response.data.id };
        }
    } catch (error) {
        console.error("Asaas API Error:", error.response ? error.response.data : error.message);
        throw new functions.https.HttpsError("internal", "Erro ao comunicar com a API de pagamentos.");
    }
});


/**
 * Checks the financial status of a customer based on their payment history.
 */
exports.checkFinancialStatus = functions.https.onCall(async (data, context) => {
    const { asaasCustomerId } = data;

    if (!asaasCustomerId) {
        throw new functions.https.HttpsError("invalid-argument", "O ID do cliente Asaas é obrigatório.");
    }

    try {
        const response = await axios.get(`${asaasApiUrl}/payments`, {
            params: { customer: asaasCustomerId, status: "OVERDUE" },
            headers: asaasHeaders,
        });

        const overduePayments = response.data.data;

        if (overduePayments.length === 0) {
            return { status: "em dia" };
        } else if (overduePayments.length <= 1) { // Business rule: 1 payment overdue is "em atraso"
            return { status: "em atraso" };
        } else { // Business rule: more than 1 payment overdue is "bloqueado"
            return { status: "bloqueado" };
        }
    } catch (error) {
        console.error("Asaas API Error:", error.response ? error.response.data : error.message);
        throw new functions.https.HttpsError("internal", "Erro ao verificar situação financeira.");
    }
});


/**
 * Gets a detailed list of a customer's charges from Asaas.
 */
exports.getFinancialDetails = functions.https.onCall(async (data, context) => {
    const { asaasCustomerId } = data;

    if (!asaasCustomerId) {
        throw new functions.https.HttpsError("invalid-argument", "O ID do cliente Asaas é obrigatório.");
    }

    try {
        const response = await axios.get(`${asaasApiUrl}/payments`, {
            params: { customer: asaasCustomerId },
            headers: asaasHeaders,
        });

        const charges = response.data.data.map(charge => ({
            id: charge.id,
            dueDate: charge.dueDate,
            value: charge.value,
            status: charge.status,
            bankSlipUrl: charge.bankSlipUrl,
        }));

        const hasOverdue = charges.some(c => c.status === 'OVERDUE');
        const overdueCount = charges.filter(c => c.status === 'OVERDUE').length;

        let generalStatus = "em dia";
        if (overdueCount > 1) {
            generalStatus = "bloqueado";
        } else if (hasOverdue) {
            generalStatus = "em atraso";
        }

        return {
            status: generalStatus,
            charges: charges,
        };

    } catch (error) {
        console.error("Asaas API Error:", error.response ? error.response.data : error.message);
        throw new functions.https.HttpsError("internal", "Erro ao buscar detalhes financeiros.");
    }
});
