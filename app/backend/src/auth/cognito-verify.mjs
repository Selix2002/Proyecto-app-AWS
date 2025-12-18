// src/auth/cognito-verify.mjs
import { createRemoteJWKSet, jwtVerify } from "jose";
import dotenv from "dotenv";
dotenv.config();

const REGION = process.env.COGNITO_REGION;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

if (!REGION || !USER_POOL_ID || !CLIENT_ID) {
    throw new Error("Faltan envs Cognito: COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID");
}

const issuer = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function verifyCognitoJwt(token) {
    // Verifica firma + issuer
    const { payload } = await jwtVerify(token, jwks, { issuer });

    // Validación “aud/client_id” según tipo de token:
    // - ID token => aud === CLIENT_ID
    // - Access token => client_id === CLIENT_ID (normalmente no trae aud)
    const tokenUse = payload.token_use; // "id" o "access"
    if (tokenUse === "id") {
        if (payload.aud !== CLIENT_ID) throw new Error("Token aud inválido");
    } else if (tokenUse === "access") {
        if (payload.client_id !== CLIENT_ID) throw new Error("Token client_id inválido");
    } else {
        throw new Error("token_use inválido");
    }

    return payload; // contiene sub, email, cognito:groups, etc.
}

export function requireAuth(req, res, next) {
    try {
        const h = req.headers.authorization || "";
        const m = h.match(/^Bearer\s+(.+)$/i);
        if (!m) return res.status(401).json({ error: "Falta Authorization: Bearer <token>" });

        const token = m[1];

        verifyCognitoJwt(token)
            .then((claims) => {
                req.user = claims; // similar a passport, pero son claims
                next();
            })
            .catch((err) => {
                return res.status(401).json({ error: "Token inválido", detail: err.message });
            });
    } catch (err) {
        return res.status(401).json({ error: "Token inválido" });
    }
}

export function requireGroup(groupName) {
    return (req, res, next) => {
        const groups = req.user?.["cognito:groups"] ?? [];
        if (!Array.isArray(groups) || !groups.includes(groupName)) {
            return res.status(403).json({ error: "No autorizado (grupo requerido)" });
        }
        next();
    };
}
